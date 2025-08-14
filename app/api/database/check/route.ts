import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');

    if (!tableName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Table name is required' 
      }, { status: 400 });
    }

    // Check table row count and status
    let rowCount = 0;
    let lastUpdated = null;
    let error = null;

    try {
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        error = countError.message;
      } else {
        rowCount = count || 0;
      }

      // Get last updated timestamp for tables that have a timestamp column
      if (!error && rowCount > 0) {
        const timestampColumns = ['created_at', 'timestamp', 'completed_at', 'started_at'];
        
        for (const col of timestampColumns) {
          try {
            const { data, error: dataError } = await supabase
              .from(tableName)
              .select(col)
              .order(col, { ascending: false })
              .limit(1)
              .single();

            if (!dataError && data && (data as any)[col]) {
              lastUpdated = (data as any)[col];
              break;
            }
          } catch {
            // Column doesn't exist, try next one
            continue;
          }
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    return NextResponse.json({
      success: true,
      tableName,
      rowCount,
      lastUpdated: lastUpdated || new Date().toISOString(),
      status: error ? 'error' : (rowCount > 0 ? 'healthy' : 'empty'),
      error: error || null
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

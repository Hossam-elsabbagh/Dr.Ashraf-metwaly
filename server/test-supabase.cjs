const { proxyTasksRequest } = require('./supabaseProxy.cjs');

(async () => {
  try {
    const rows = await proxyTasksRequest({ method: 'GET' });
    console.log('[supabase-test] SUCCESS');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('[supabase-test] FAILED');
    console.error(error);
    process.exitCode = 1;
  }
})();

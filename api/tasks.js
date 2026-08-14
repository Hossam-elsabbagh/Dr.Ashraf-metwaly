const { handleTasks } = require('../server/supabaseProxy.cjs');

module.exports = async function handler(req, res) {
  return handleTasks(req, res);
};

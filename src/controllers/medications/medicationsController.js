const paginate = require('../../utils/pagination');

exports.getCountertopMedications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      table: 'medications',
      page,
      limit,
      sort,
      filters : {
        type: 'countertop',
        name: req.query.name || undefined
      }
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

exports.getPrescriptionMedications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      table: 'medications',
      page,
      limit,
      sort,
      filters : {
        type: 'prescription',
        name: req.query.name || undefined
      }
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Initialize table
Category.init();

// GET all categories
router.get('/', (req, res) => {
  Category.getAll((err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch categories' });
    res.json(results);
  });
});

// POST create new category
router.post('/', (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });

  Category.create({ name, slug }, (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Slug already exists' });
      return res.status(500).json({ error: 'Failed to create category' });
    }
    res.status(201).json({ message: 'Category created' });
  });
});

// PUT update category
router.put('/:slug', (req, res) => {
  const { name, slug: newSlug } = req.body;
  const { slug: oldSlug } = req.params;

  if (!name || !newSlug) return res.status(400).json({ error: 'Name and slug are required' });

  Category.update(oldSlug, { name, slug: newSlug }, (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to update category' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category updated' });
  });
});

// DELETE category
router.delete('/:slug', (req, res) => {
  const { slug } = req.params;

  Category.delete(slug, (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to delete category' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  });
});

module.exports = router;

const express = require("express");
const router = express.Router();
const Course = require("../models/Course");

router.get("/", (req, res) => {
  const keyword = req.query.query || "";

  Course.searchByTitle(keyword, (err, results) => {
    if (err) {
      console.error("Search error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

module.exports = router;

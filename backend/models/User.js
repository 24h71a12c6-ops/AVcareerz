const pool = require('../config/db');

class User {
  static async create(userData) {
    const { fullName, email, phone, country } = userData;
    try {
      const [result] = await pool.query(
        `INSERT INTO users (full_name, email, phone, country, registration_status)
                 VALUES (?, ?, ?, ?, ?)`,
        [fullName, email, phone, country, 'step1_complete']
      );
      return { id: result.insertId, ...userData };
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    const { qualification, preferredCountry, budget, workExperience } = updateData;
    try {
      const [result] = await pool.query(
        `UPDATE users 
                 SET qualification = ?, preferred_country = ?, budget = ?, work_experience = ?, registration_status = 'fully_registered'
                 WHERE id = ?`,
        [qualification, preferredCountry, budget, workExperience, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;

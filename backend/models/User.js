const db = require('../config/firebaseClient');

class User {
  static async create(userData) {
    const { fullName, email, phone, country } = userData;
    try {
      const ref = await db.collection('users').add({
        full_name: fullName,
        email: email,
        phone: phone,
        country: country,
        registration_status: 'step1_complete'
      });
      return { id: ref.id, ...userData };
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const snap = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    const { qualification, preferredCountry, budget, workExperience } = updateData;
    try {
      const docRef = db.collection('users').doc(id);
    await docRef.update({
      qualification: qualification,
      preferred_country: preferredCountry,
      budget: budget,
      work_experience: workExperience,
      registration_status: 'fully_registered'
    });
    return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;

const supabase = require('../config/supabaseClient');

class User {
  static async create(userData) {
    const { fullName, email, phone, country } = userData;
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          full_name: fullName,
          email: email,
          phone: phone,
          country: country,
          registration_status: 'step1_complete'
        }])
        .select();

      if (error) throw error;
      
      return { id: data[0].id, ...userData };
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    const { qualification, preferredCountry, budget, workExperience } = updateData;
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          qualification: qualification,
          preferred_country: preferredCountry,
          budget: budget,
          work_experience: workExperience,
          registration_status: 'fully_registered'
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      
      return data && data.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;

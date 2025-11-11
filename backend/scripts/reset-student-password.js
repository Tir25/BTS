const { getStudentSupabaseAdmin } = require('../dist/config/supabase/studentClient.js');

async function resetStudentPassword() {
  try {
    const admin = getStudentSupabaseAdmin();
    const userId = '16320452-7aa3-4e75-91ea-56b961490dbc';
    const newPassword = 'testpassword123';
    
    console.log('Resetting password for student account...');
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    
    if (error) {
      console.error('Error resetting password:', error);
      process.exit(1);
    }
    
    console.log('✅ Password reset successfully!');
    console.log('Email: teststudent@university.edu');
    console.log('Password: testpassword123');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetStudentPassword();

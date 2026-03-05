const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../../config/db');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;

      // Check if user exists
      let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (user.rows.length === 0) {
        // Create user if not exists
        const fullName = profile.displayName;
        const role = 'patient'; // Default role
        const newUser = await pool.query(
          `INSERT INTO users (full_name, email, role) 
           VALUES ($1, $2, $3) RETURNING *`,
          [fullName, email, role]
        );
        return done(null, newUser.rows[0]);
      }

      // User already exists
      return done(null, user.rows[0]);
    } catch (err) {
      return done(err, null);
    }
  }
));


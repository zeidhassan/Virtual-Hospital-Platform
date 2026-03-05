const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const pool = require('../../config/db');
require('dotenv').config();

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: '/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0]?.value;
      if (!email) {
        return done(new Error('No email found in Facebook profile'), null);
      }

      // Check if user already exists
      let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        // Create new user with default role
        const fullName = profile.displayName;
        const role = 'patient';

        const newUser = await pool.query(
          `INSERT INTO users (full_name, email, role) 
           VALUES ($1, $2, $3) RETURNING *`,
          [fullName, email, role]
        );
        return done(null, newUser.rows[0]);
      }

      // Return existing user
      return done(null, result.rows[0]);
    } catch (err) {
      return done(err, null);
    }
  }
));

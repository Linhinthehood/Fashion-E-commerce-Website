const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Customer = require('../models/Customer');

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile:', profile);
    
    // Check if user already exists with this Google ID
    let existingUser = await User.findOne({ googleId: profile.id });
    
    if (existingUser) {
      return done(null, existingUser);
    }
    
    // Check if user exists with same email
    existingUser = await User.findOne({ email: profile.emails[0].value });
    
    if (existingUser) {
      // Link Google account to existing user
      existingUser.googleId = profile.id;
      await existingUser.save();
      return done(null, existingUser);
    }
    
    // Create new user
    const newUser = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0]?.value || null,
      role: 'Customer', // Default role for Google OAuth users
      status: 'Active'
    });
    
    await newUser.save();
    
    // Create customer profile for new user
    const customer = new Customer({
      userId: newUser._id,
      addresses: []
    });
    await customer.save();
    
    return done(null, newUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

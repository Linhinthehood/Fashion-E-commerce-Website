const { sendContactFormEmail } = require('../services/emailService');

// Handle contact form submission
const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Recipients for contact form emails
    const recipients = [
      'duclinhhopham@gmail.com',
      'khangjaki12@gmail.com'
    ];

    // Send email to both recipients
    const result = await sendContactFormEmail(
      { name, email, phone, subject, message },
      recipients
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send your message. Please try again later.',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in submitContactForm:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      error: error.message
    });
  }
};

module.exports = {
  submitContactForm
};

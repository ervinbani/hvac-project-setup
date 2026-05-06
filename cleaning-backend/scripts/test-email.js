require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { sendVerificationEmail } = require("../src/services/email.service");

(async () => {
  try {
    await sendVerificationEmail({
      to: "bani.ervin@gmail.com",
      firstName: "Ervin",
      verificationToken: "test-token-1234567890abcdef",
    });
    console.log(
      "✅ Verification email sent successfully to bani.ervin@gmail.com",
    );
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
  }
})();

(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const feedback = document.getElementById('form-feedback');

  function showFeedback(message, isError) {
    feedback.textContent = message;
    feedback.className = 'form-feedback ' +
      (isError ? 'form-feedback--error' : 'form-feedback--success');
    feedback.style.display = 'block';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const message = form.querySelector('[name="message"]').value.trim();

    if (!name || !email || !message) {
      showFeedback('Please fill in all fields.', true);
      return;
    }

    if (!isValidEmail(email)) {
      showFeedback('Please enter a valid email address.', true);
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: 'f50ffbea-5940-4889-bfde-10d301d203b8',
          name,
          email,
          message,
          subject: 'GV Digital contact form: ' + name,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showFeedback('Message sent! We\'ll get back to you soon.', false);
        form.reset();
      } else {
        showFeedback(data.error || 'Something went wrong. Please try again.', true);
      }
    } catch {
      showFeedback('Could not send message. Please try again later.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send message';
    }
  });
})();

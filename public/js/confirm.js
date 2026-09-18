(function () {
  const scriptTag = document.currentScript;
  const token = scriptTag.dataset.token;

  document.querySelectorAll('.topic').forEach((topicEl) => {
    const topicId = topicEl.dataset.topicId;
    const bodyEl = topicEl.querySelector('[data-topic-body]');
    const input = topicEl.querySelector('[data-signature-input]');
    const btn = topicEl.querySelector('[data-confirm-btn]');
    const hint = topicEl.querySelector('[data-scroll-hint]');
    const errorEl = topicEl.querySelector('[data-error]');

    if (!bodyEl || !input || !btn) return; // already confirmed topic, nothing to wire up

    let scrolled = false;

    function checkScrolled() {
      if (scrolled) return;
      const atBottom = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 8;
      const fitsWithoutScrolling = bodyEl.scrollHeight <= bodyEl.clientHeight + 4;
      if (atBottom || fitsWithoutScrolling) {
        scrolled = true;
        input.disabled = false;
        btn.disabled = false;
        if (hint) hint.textContent = 'Thanks — you can sign off below now.';
        fetch(`/confirm/${token}/topics/${topicId}/scrolled`, { method: 'POST' });
      }
    }

    bodyEl.addEventListener('scroll', checkScrolled);
    // In case the content is short enough to not need scrolling at all.
    checkScrolled();

    btn.addEventListener('click', async () => {
      errorEl.style.display = 'none';
      btn.disabled = true;
      try {
        const res = await fetch(`/confirm/${token}/topics/${topicId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signature: input.value, scrolled: String(scrolled) }),
        });
        const data = await res.json();
        if (!data.ok) {
          errorEl.textContent = data.errors.join(' ');
          errorEl.style.display = 'block';
          btn.disabled = false;
          return;
        }
        // Reload so the topic renders in its confirmed, read-only state
        // and the "all done" banner updates if this was the last topic.
        window.location.reload();
      } catch (err) {
        errorEl.textContent = 'Something went wrong sending your confirmation. Please try again.';
        errorEl.style.display = 'block';
        btn.disabled = false;
      }
    });
  });
})();

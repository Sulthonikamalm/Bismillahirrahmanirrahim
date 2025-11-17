// ============================================
// ABOUT.JS – Counter untuk Jumlah Pelapor
// Hanya dijalankan di halaman about
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  const speed = 120;

  const animateCounter = (counter) => {
    const target = +counter.getAttribute('data-target');
    const count = +counter.innerText;
    const inc = target / speed;

    if (count < target) {
      counter.innerText = Math.ceil(count + inc);
      setTimeout(() => animateCounter(counter), 15);
    } else {
      counter.innerText = target.toLocaleString('id-ID');
    }
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        counters.forEach(counter => animateCounter(counter));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const section = document.querySelector('.pelapor');
  if (section) observer.observe(section);
});


document.addEventListener('DOMContentLoaded', () => {
    const starsContainer = document.getElementById('stars');
    const bubblesContainer = document.getElementById('bubbles');

    if (starsContainer) {
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            const size = Math.random() * 3 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.animationDelay = `${Math.random() * 2}s`;
            starsContainer.appendChild(star);
        }
    }

    if (bubblesContainer) {
        for (let i = 0; i < 20; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.style.left = `${Math.random() * 100}%`;
            const size = Math.random() * 30 + 10;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.animationDelay = `${Math.random() * 8}s`;
            bubble.style.animationDuration = `${Math.random() * 4 + 6}s`;
            bubblesContainer.appendChild(bubble);
        }
    }
});

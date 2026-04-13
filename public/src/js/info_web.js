
function filtrarVideos(cultivo) {
    const videos = document.querySelectorAll('.video-item');

    videos.forEach(video => {
        if (cultivo === 'todos' || video.dataset.cultivo === cultivo) {
            video.style.display = 'block';
        } else {
            video.style.display = 'none';
        }
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const videoItems = document.querySelectorAll(".video-item");
    const modal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalVideo");
    const closeBtn = document.querySelector(".close-video");

    videoItems.forEach(item => {
        item.addEventListener("click", () => {
            const videoSrc = item.getAttribute("data-video");

            modalVideo.src = videoSrc;
            modal.style.display = "flex";
            modalVideo.load();
            modalVideo.play();
        });
    });

    closeBtn.addEventListener("click", () => {
        modalVideo.pause();
        modalVideo.src = "";
        modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modalVideo.pause();
            modalVideo.src = "";
            modal.style.display = "none";
        }
    });
});

let currentIndex = 0;

function moveCarousel(direction) {
    const track = document.querySelector('.video-mosaico');
    const items = document.querySelectorAll('.video-item');
    const visibleItems = Math.floor(
        document.querySelector('.video-mosaico-wrapper').offsetWidth /
        items[0].offsetWidth
    );

    const maxIndex = items.length - visibleItems;
    currentIndex += direction;

    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex > maxIndex) currentIndex = maxIndex;

    const offset = currentIndex * (items[0].offsetWidth + 20);
    track.style.transform = `translateX(-${offset}px)`;
}


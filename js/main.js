"use strict";

/*
 * 寰宇元年 · 博客交互脚本（编辑部风格版）
 */

(function () {
    // 平滑滚动 + 导航高亮
    const navLinks = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('section[id]');
    const backToTop = document.querySelector('.back-to-top');
    const notice = document.querySelector('.site-notice');
    const noticeClose = document.querySelector('.notice-close');

    // 导航点击平滑滚动
    navLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href').slice(1);
            const target = document.getElementById(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 关闭公告带（裁切收起动画）
    if (notice && noticeClose) {
        noticeClose.addEventListener('click', function () {
            notice.classList.add('is-leaving');
            notice.addEventListener('animationend', () => notice.remove(), { once: true });
        });
    }

    // 滚动时更新导航高亮 + 返回顶部
    function onScroll() {
        const scrollY = window.scrollY;

        let current = '';
        sections.forEach((section) => {
            const sectionTop = section.offsetTop - 120;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach((link) => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });

        if (backToTop) {
            backToTop.classList.toggle('show', scrollY > 500);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 滚动显示动画（IntersectionObserver）
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
        revealElements.forEach((el) => observer.observe(el));
    } else {
        revealElements.forEach((el) => el.classList.add('visible'));
    }
})();

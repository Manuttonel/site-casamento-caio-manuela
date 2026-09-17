/* ==========================================================
   Caio & Manuela — site.js
   ========================================================== */

(function () {
    "use strict";

    /* ---------- Configuração ---------- */
    // RSVP: respostas vão direto para o Google Forms "CONFIRMAÇÃO DE PRESENÇA DO
    // CASAMENTO", que está ligado a uma planilha do Google Sheets. Os IDs dos
    // campos (entry.XXXX) vêm da estrutura interna do próprio formulário — se
    // um dia você recriar o formulário do zero, esses números vão mudar e
    // precisam ser atualizados aqui.
    var GOOGLE_FORM_ID = "1FAIpQLSe-caAEb2MwdQkWHWUWoKDGIUBh3XoUk0FxcW6bFFHBlJ3WYw";
    var GOOGLE_FORM_ENDPOINT = "https://docs.google.com/forms/d/e/" + GOOGLE_FORM_ID + "/formResponse";
    var GOOGLE_FORM_FIELDS = {
        nome: "entry.1436333493",
        telefone: "entry.2043925754",
        presenca: "entry.1924929497",
        mensagem: "entry.2084861814"
    };
    // Os valores de presença precisam bater com o texto exato das opções do
    // formulário (o Forms é sensível a isso).
    var GOOGLE_FORM_PRESENCA = {
        "Sim, estarei presente": "SIM, ESTAREI PRESENTE",
        "Não poderei comparecer": "NÃO PODEREI COMPARECER"
    };

    var WEDDING_DATE = new Date("2027-02-06T16:00:00-03:00");
    var RSVP_DEADLINE = new Date("2027-01-01T23:59:59-03:00");
    var DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1_oTLBOREIaxFnu5idmNPJijCsW3hkMUv";

    // Enquanto a lista oficial de convidados não estiver pronta, deixe "false"
    // para que qualquer pessoa consiga preencher o formulário. Quando a lista
    // estiver cadastrada em assets/guests.js, volte para "true".
    var REQUIRE_GUEST_LIST = false;

    /* ---------- Utilidades ---------- */
    function normalize(text) {
        return String(text || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    function isRegisteredGuest(typedName) {
        var target = normalize(typedName);
        if (!target) return false;
        var list = (typeof GUEST_LIST !== "undefined") ? GUEST_LIST : [];
        return list.some(function (guest) {
            var g = normalize(guest);
            return g === target || g.indexOf(target) !== -1 || target.indexOf(g) !== -1;
        });
    }

    /* ---------- Navegação mobile ---------- */
    function initNav() {
        var toggle = document.getElementById("cm-navToggle");
        var links = document.getElementById("cm-navLinks");
        if (!toggle || !links) return;

        toggle.addEventListener("click", function () {
            var open = links.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });

        links.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", function () {
                links.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    /* ---------- Contador regressivo ---------- */
    function initCountdown() {
        var daysEl = document.getElementById("cm-days");
        var hoursEl = document.getElementById("cm-hours");
        var minsEl = document.getElementById("cm-mins");
        var secsEl = document.getElementById("cm-secs");
        if (!daysEl) return;

        function tick() {
            var diff = WEDDING_DATE - new Date();
            if (diff <= 0) {
                daysEl.textContent = "0";
                hoursEl.textContent = minsEl.textContent = secsEl.textContent = "00";
                return;
            }
            var totalSeconds = Math.floor(diff / 1000);
            daysEl.textContent = Math.floor(totalSeconds / 86400);
            hoursEl.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
            minsEl.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
            secsEl.textContent = String(totalSeconds % 60).padStart(2, "0");
        }

        tick();
        setInterval(tick, 1000);
    }

    /* ---------- Formulário de confirmação (RSVP) ---------- */
    function initRsvp() {
        var form = document.getElementById("cm-rsvpForm");
        if (!form) return;

        var nameInput = document.getElementById("cm-name");
        var phoneInput = document.getElementById("cm-phone");
        var statusSelect = document.getElementById("cm-status");
        var noteInput = document.getElementById("cm-note");
        var submitBtn = document.getElementById("cm-submit");
        var msgEl = document.getElementById("cm-formMsg");
        var closedEl = document.getElementById("cm-closed");

        function pastDeadline() {
            return new Date() > RSVP_DEADLINE;
        }

        if (pastDeadline()) {
            form.hidden = true;
            closedEl.hidden = false;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (pastDeadline()) {
                form.hidden = true;
                closedEl.hidden = false;
                return;
            }

            var name = nameInput.value.trim();
            var phone = phoneInput.value.trim();
            var status = statusSelect.value;
            var note = noteInput.value.trim() || "Nenhuma mensagem";

            if (!name || !status) {
                msgEl.textContent = "Preencha seu nome e informe se estará presente.";
                return;
            }

            if (!phone) {
                msgEl.textContent = "Informe um telefone para a nossa assessora entrar em contato.";
                return;
            }

            if (REQUIRE_GUEST_LIST && !isRegisteredGuest(name)) {
                msgEl.textContent = "Não encontramos esse nome na nossa lista de convidados. Verifique se digitou certinho (como no convite) ou fale diretamente com Caio, Manuela ou a assessora Viviane.";
                return;
            }

            submitBtn.disabled = true;
            msgEl.textContent = "Enviando sua confirmação...";

            var params = new URLSearchParams();
            params.append(GOOGLE_FORM_FIELDS.nome, name);
            params.append(GOOGLE_FORM_FIELDS.telefone, phone);
            params.append(GOOGLE_FORM_FIELDS.presenca, GOOGLE_FORM_PRESENCA[status] || status);
            params.append(GOOGLE_FORM_FIELDS.mensagem, note);

            // O Google Forms não permite ler a resposta pelo navegador (modo
            // "no-cors"), então não dá pra confirmar 100% o sucesso por aqui —
            // se o fetch não gerar erro de rede, consideramos enviado.
            fetch(GOOGLE_FORM_ENDPOINT, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString()
            })
                .then(function () {
                    msgEl.innerHTML = status === "Sim, estarei presente"
                        ? "<strong>Resposta registrada!</strong> Em breve nossa assessora entra em contato pelo telefone informado para finalizar ♡"
                        : "<strong>Resposta registrada.</strong> Agradecemos por nos avisar com carinho.";

                    form.reset();
                })
                .catch(function (error) {
                    msgEl.textContent = "Não conseguimos registrar agora. Tente novamente em instantes.";
                    console.error(error);
                })
                .finally(function () {
                    submitBtn.disabled = false;
                });
        });
    }

    /* ---------- Carrossel "Sobre o amor" ---------- */
    function initCarousel() {
        var root = document.getElementById("cm-carousel");
        if (!root) return;

        var track = document.getElementById("cm-carouselTrack");
        var slides = Array.prototype.slice.call(track.children);
        var dotsWrap = document.getElementById("cm-carouselDots");
        var prevBtn = document.getElementById("cm-prevSlide");
        var nextBtn = document.getElementById("cm-nextSlide");
        var current = 0;
        var timer = null;

        slides.forEach(function (_, i) {
            var dot = document.createElement("button");
            dot.type = "button";
            dot.setAttribute("aria-label", "Ver foto " + (i + 1));
            dot.addEventListener("click", function () { goTo(i); restartAuto(); });
            dotsWrap.appendChild(dot);
        });
        var dots = Array.prototype.slice.call(dotsWrap.children);

        function render() {
            track.style.transform = "translateX(-" + (current * 100) + "%)";
            dots.forEach(function (d, i) { d.classList.toggle("is-active", i === current); });
        }

        function goTo(index) {
            current = (index + slides.length) % slides.length;
            render();
        }

        function restartAuto() {
            if (timer) clearInterval(timer);
            timer = setInterval(function () { goTo(current + 1); }, 5500);
        }

        prevBtn.addEventListener("click", function () { goTo(current - 1); restartAuto(); });
        nextBtn.addEventListener("click", function () { goTo(current + 1); restartAuto(); });

        render();
        restartAuto();
    }

    /* ---------- Revelar elementos ao rolar ---------- */
    function initReveal() {
        var targets = document.querySelectorAll(".cm-card, .cm-frame, .cm-note, .cm-agenda__item");
        if (!("IntersectionObserver" in window) || !targets.length) {
            targets.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
        targets.forEach(function (el) { observer.observe(el); });
    }

    /* ---------- Link do Drive ---------- */
    function checkDriveLink() {
        var link = document.getElementById("cm-driveLink");
        if (!link) return;
        if (!DRIVE_FOLDER_URL || DRIVE_FOLDER_URL.indexOf("COLE_") !== -1) {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                alert("Substitua o link da pasta do Drive antes de publicar o site.");
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!location.hash) {
            window.scrollTo(0, 0);
        }
        initNav();
        initCountdown();
        initRsvp();
        initCarousel();
        initReveal();
        checkDriveLink();
    });
})();

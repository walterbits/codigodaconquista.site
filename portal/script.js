// LINKS DOS CHECKOUTS — cole cada link real entre as aspas correspondentes.
const CHECKOUT_URLS = Object.freeze({
  basic: "https://checkout.payt.com.br/737a537f303663d1b566116bceeb7341",        // Plano Básico de R$ 10,00
  premium: "https://checkout.payt.com.br/260fdb9a6a40b5fd6d53135aaa63acaf",      // Plano Premium normal de R$ 27,00
  premium2290: "https://checkout.payt.com.br/2daeb34d2c59bcf8b509ef9968544e39",  // 1ª oferta do pop-up: R$ 22,90
  premium1700: "https://checkout.payt.com.br/e1a0e6244882cb1a64b5aaf4a932a79f"   // 2ª oferta do pop-up: R$ 17,00
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   PRIMEIRO BOTÃO: ROLAGEM SUAVE ATÉ OS DOIS PLANOS
   =========================================================
   O botão do topo usa data-scroll-pricing.
   No computador, a rolagem enquadra os dois cards lado a lado.
   No celular, o cálculo centraliza os preços de R$ 10,00 e R$ 27,00
   para que ambos apareçam na mesma tela sempre que a altura permitir.
*/
(function initPricingScroll() {
  const trigger = document.querySelector("[data-scroll-pricing]");
  const pricingSection = document.getElementById("promocao");
  const pricingGrid = document.querySelector("[data-pricing-target]");
  const basicPrice = pricingGrid?.querySelector(".basic-plan .price");
  const premiumPrice = pricingGrid?.querySelector(".premium-plan .premium-price");

  if (!trigger || !pricingSection || !pricingGrid) return;

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
  // Curva mais rápida: começa a rolagem imediatamente e desacelera ao chegar.
  const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);

  function calculateDestination() {
    const currentScroll = window.scrollY || window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const mobileLayout = window.matchMedia("(max-width: 820px)").matches;
    let destination;

    if (mobileLayout && basicPrice && premiumPrice) {
      const basicRect = basicPrice.getBoundingClientRect();
      const premiumRect = premiumPrice.getBoundingClientRect();
      const basicCenter = currentScroll + basicRect.top + basicRect.height / 2;
      const premiumCenter = currentScroll + premiumRect.top + premiumRect.height / 2;
      const pricesDistance = premiumCenter - basicCenter;
      const safeTop = 22;
      const safeBottom = 28;
      const availableHeight = viewportHeight - safeTop - safeBottom;

      if (pricesDistance <= availableHeight) {
        // Centraliza os dois preços dentro da tela do celular.
        destination = (basicCenter + premiumCenter) / 2 - viewportHeight / 2;
      } else {
        // Em telas extremamente baixas, prioriza o início dos planos sem esconder o preço básico.
        destination = currentScroll + pricingGrid.getBoundingClientRect().top - 12;
      }
    } else {
      // No desktop/tablet, deixa uma pequena margem acima dos cards e mostra os dois preços lado a lado.
      const topGap = Math.min(105, viewportHeight * 0.12);
      destination = currentScroll + pricingGrid.getBoundingClientRect().top - topGap;
    }

    return clamp(destination, 0, Math.max(0, pageHeight - viewportHeight));
  }

  function scrollToPricing() {
    const start = window.scrollY || window.pageYOffset;
    const destination = calculateDestination();
    const distance = destination - start;

    if (reducedMotion || Math.abs(distance) < 2) {
      window.scrollTo(0, destination);
      history.replaceState(null, "", "#promocao");
      return;
    }

    // Rolagem curta e responsiva, sem a sensação de atraso de quase 1 segundo.
    const duration = clamp(Math.abs(distance) * 0.14, 260, 420);
    const startedAt = performance.now();

    function animate(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      window.scrollTo(0, start + distance * easeOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        history.replaceState(null, "", "#promocao");
      }
    }

    requestAnimationFrame(animate);
  }

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    scrollToPricing();
  });
})();

function redirectToCheckout(checkoutKey, trigger) {
  const checkoutUrl = CHECKOUT_URLS[checkoutKey];
  if (!checkoutUrl) {
    alert(`Adicione o link do checkout "${checkoutKey}" no início do arquivo script.js.`);
    return false;
  }

  document.querySelectorAll(".offer-action").forEach((button) => {
    button.disabled = true;
    button.classList.add("is-redirecting");
  });
  if (trigger) {
    trigger.classList.add("is-redirecting");
    trigger.setAttribute("aria-busy", "true");
  }

  // Redirecionamento imediato: a pessoa não precisa clicar novamente.
  window.location.assign(checkoutUrl);
  return true;
}

// Botões que realmente abrem o checkout Premium. O botão principal apenas rola até os planos.
document.querySelectorAll("[data-checkout]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    redirectToCheckout(button.dataset.checkout || "premium", button);
  });
});

// Funil em dois pop-ups ao clicar no Plano Básico.
(function initBasicPlanOffers() {
  const modal = document.getElementById("offer-modal");
  const basicButtons = [...document.querySelectorAll("[data-basic-offer]")];
  const stepOne = document.getElementById("offer-step-1");
  const stepTwo = document.getElementById("offer-step-2");
  if (!modal || !stepOne || !stepTwo || !basicButtons.length) return;

  let currentStep = 0;
  let previousFocus = null;
  let switching = false;

  const dialogFor = (step) => step === 2 ? stepTwo : stepOne;
  const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const focusFirstControl = (dialog) => {
    requestAnimationFrame(() => dialog.querySelector(focusableSelector)?.focus({ preventScroll: true }));
  };

  const renderStep = (step, animate = true) => {
    currentStep = step;
    modal.classList.toggle("is-red", step === 2);
    [stepOne, stepTwo].forEach((dialog) => {
      const active = dialog === dialogFor(step);
      dialog.hidden = !active;
      dialog.classList.remove("is-visible", "is-leaving");
      if (active) {
        if (animate && !reducedMotion) {
          void dialog.offsetWidth;
          dialog.classList.add("is-visible");
        } else {
          dialog.classList.add("is-visible");
        }
      }
    });
    focusFirstControl(dialogFor(step));
  };

  const openModal = () => {
    previousFocus = document.activeElement;
    document.body.classList.add("offer-modal-open");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    renderStep(1);
  };

  const switchToSecondOffer = () => {
    if (switching) return;
    switching = true;
    const outgoing = dialogFor(1);
    if (reducedMotion) {
      renderStep(2, false);
      switching = false;
      return;
    }
    outgoing.classList.remove("is-visible");
    outgoing.classList.add("is-leaving");
    window.setTimeout(() => {
      renderStep(2, true);
      switching = false;
    }, 170);
  };

  const declineCurrentOffer = (trigger) => {
    if (currentStep === 1) {
      switchToSecondOffer();
    } else {
      redirectToCheckout("basic", trigger);
    }
  };

  basicButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openModal();
    });
  });

  modal.addEventListener("click", (event) => {
    const accept = event.target.closest("[data-offer-accept]");
    if (accept) {
      redirectToCheckout(accept.dataset.offerAccept, accept);
      return;
    }

    const decline = event.target.closest("[data-offer-decline]");
    if (decline) declineCurrentOffer(decline);
  });

  // Mantém o foco dentro do pop-up para funcionar bem com teclado e leitores de tela.
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      declineCurrentOffer(dialogFor(currentStep).querySelector("[data-offer-decline]"));
      return;
    }
    if (event.key !== "Tab") return;

    const controls = [...dialogFor(currentStep).querySelectorAll(focusableSelector)]
      .filter((element) => element.offsetParent !== null);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Caso o navegador restaure a página após voltar do checkout, reativa os botões.
  window.addEventListener("pageshow", () => {
    document.querySelectorAll(".offer-action, [data-checkout]").forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-redirecting");
      button.removeAttribute("aria-busy");
    });
  });
})();

// Animações de entrada conforme a rolagem.
(function initRevealAnimations() {
  const elements = [...document.querySelectorAll("[data-reveal]")];
  if (!elements.length || reducedMotion || !("IntersectionObserver" in window)) return;

  elements.forEach((element) => {
    element.classList.add("reveal-pending");
    element.style.setProperty("--reveal-delay", `${Number(element.dataset.delay || 0)}ms`);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("reveal-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

  elements.forEach((element) => observer.observe(element));
})();

// O vídeo principal será carregado pela VTurb diretamente no bloco #vturb-player-slot.
// Não há controlador local de vídeo para evitar conflito com autoplay, analytics e eventos do SmartPlayer.

// Carrossel contínuo das estampas, com arraste no mouse e no celular.
(function initGalleryMarquee() {
  const shell = document.querySelector(".gallery-shell");
  const track = document.querySelector(".gallery-track");
  if (!shell || !track) return;

  const originals = [...track.children];
  const originalCount = originals.length;
  originals.forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.alt = "";
    track.appendChild(clone);
  });

  let offset = 0;
  let cycleWidth = 0;
  let lastTime = performance.now();
  let paused = reducedMotion;
  let dragging = false;
  let dragStartX = 0;
  let dragStartOffset = 0;
  const speed = 44; // pixels por segundo

  const calculateWidth = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    cycleWidth = originals.reduce((total, item) => total + item.getBoundingClientRect().width, 0) + gap * originalCount;
    if (cycleWidth > 0) offset %= cycleWidth;
  };

  const normalizeOffset = (value) => {
    if (!cycleWidth) return Math.max(0, value);
    return ((value % cycleWidth) + cycleWidth) % cycleWidth;
  };

  const paint = () => {
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  };

  const animate = (time) => {
    const delta = Math.min(50, time - lastTime);
    lastTime = time;
    if (!paused && !dragging && cycleWidth) {
      offset = normalizeOffset(offset + speed * (delta / 1000));
      paint();
    }
    requestAnimationFrame(animate);
  };

  const startDrag = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    dragStartX = event.clientX;
    dragStartOffset = offset;
    shell.classList.add("is-dragging");
    shell.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - dragStartX;
    offset = normalizeOffset(dragStartOffset - deltaX);
    paint();
  };

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    shell.classList.remove("is-dragging");
    shell.releasePointerCapture?.(event.pointerId);
  };

  shell.addEventListener("pointerdown", startDrag);
  shell.addEventListener("pointermove", moveDrag);
  shell.addEventListener("pointerup", endDrag);
  shell.addEventListener("pointercancel", endDrag);
  shell.addEventListener("mouseenter", () => { paused = true; });
  shell.addEventListener("mouseleave", () => { if (!reducedMotion) paused = false; });

  document.addEventListener("visibilitychange", () => {
    paused = document.hidden || reducedMotion;
    lastTime = performance.now();
  });

  window.addEventListener("resize", calculateWidth, { passive: true });
  window.addEventListener("load", calculateWidth, { once: true });
  Promise.all(originals.map((image) => image.decode?.().catch(() => {}) || Promise.resolve())).then(calculateWidth);
  calculateWidth();
  requestAnimationFrame(animate);
})();

// Carrossel automático e navegável dos depoimentos.
// Usa uma cópia completa dos slides em cada lado e trava a transição entre movimentos.
// Isso impede áreas vazias mesmo com cliques, toques ou arrastes muito rápidos.
(function initTestimonialSlider() {
  const slider = document.querySelector(".testimonial-slider");
  const viewport = slider?.querySelector(".testimonial-viewport");
  const track = slider?.querySelector(".testimonial-track");
  const prevButton = slider?.querySelector(".slider-prev");
  const nextButton = slider?.querySelector(".slider-next");
  const dotsContainer = document.querySelector(".testimonial-dots");
  if (!slider || !viewport || !track || !prevButton || !nextButton || !dotsContainer) return;

  const originals = [...track.children];
  const slideCount = originals.length;
  if (!slideCount) return;

  const cloneSlide = (slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    const image = clone.querySelector("img");
    if (image) {
      image.alt = "";
      image.loading = "eager";
      image.decoding = "async";
    }
    return clone;
  };

  const beforeFragment = document.createDocumentFragment();
  const afterFragment = document.createDocumentFragment();
  originals.forEach((slide) => beforeFragment.appendChild(cloneSlide(slide)));
  originals.forEach((slide) => afterFragment.appendChild(cloneSlide(slide)));
  track.prepend(beforeFragment);
  track.append(afterFragment);

  let renderIndex = slideCount;
  let logicalIndex = 0;
  let timer = null;
  let transitionTimer = null;
  let transitioning = false;
  let queuedDirection = 0;
  let queuedTarget = null;
  let dragging = false;
  let pointerId = null;
  let dragStartX = 0;
  let dragLastX = 0;
  let baseTranslate = 0;
  let pausedByVisibility = false;
  let pausedByInteraction = false;

  const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const getGap = () => parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
  const getStep = () => {
    const firstSlide = track.querySelector(".testimonial-card");
    return firstSlide ? firstSlide.getBoundingClientRect().width + getGap() : 0;
  };
  const getTranslate = (targetIndex = renderIndex) => -(targetIndex * getStep());

  const dots = originals.map((_, dotIndex) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Mostrar depoimento ${dotIndex + 1}`);
    dot.addEventListener("click", () => requestTarget(dotIndex));
    dotsContainer.appendChild(dot);
    return dot;
  });

  const updateDots = () => {
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === logicalIndex;
      dot.classList.toggle("active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
  };

  const setTransform = (animate = true, customTranslate = null) => {
    const duration = animate && !reducedMotion ? 320 : 0;
    track.style.transition = duration ? "transform .32s cubic-bezier(.22,.7,.25,1)" : "none";
    const translate = customTranslate ?? getTranslate();
    track.style.transform = `translate3d(${Math.round(translate * 1000) / 1000}px,0,0)`;
    updateDots();
  };

  const normalizeRenderIndex = () => {
    if (renderIndex >= slideCount * 2) renderIndex -= slideCount;
    if (renderIndex < slideCount) renderIndex += slideCount;
    setTransform(false);
  };

  const clearTransitionWatchdog = () => {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  };

  const finishTransition = () => {
    if (!transitioning) return;
    clearTransitionWatchdog();
    transitioning = false;
    normalizeRenderIndex();

    if (queuedTarget !== null) {
      const target = queuedTarget;
      queuedTarget = null;
      requestTarget(target);
      return;
    }

    if (queuedDirection) {
      const direction = queuedDirection;
      queuedDirection = 0;
      startMove(direction);
    }
  };

  const startMove = (direction) => {
    if (!direction || dragging) return;
    if (transitioning) {
      queuedDirection = direction;
      return;
    }

    logicalIndex = modulo(logicalIndex + direction, slideCount);
    renderIndex += direction;
    transitioning = !reducedMotion;
    setTransform(true);

    if (reducedMotion) {
      normalizeRenderIndex();
    } else {
      clearTransitionWatchdog();
      transitionTimer = window.setTimeout(finishTransition, 480);
    }
  };

  const requestMove = (direction) => {
    queuedTarget = null;
    startMove(direction < 0 ? -1 : 1);
    resetTimer();
  };

  const requestTarget = (targetIndex) => {
    targetIndex = modulo(targetIndex, slideCount);
    if (dragging) return;
    if (transitioning) {
      queuedTarget = targetIndex;
      queuedDirection = 0;
      return;
    }

    let delta = targetIndex - logicalIndex;
    if (Math.abs(delta) > slideCount / 2) delta += delta > 0 ? -slideCount : slideCount;
    if (!delta) {
      resetTimer();
      return;
    }

    logicalIndex = targetIndex;
    renderIndex += delta;
    transitioning = !reducedMotion;
    setTransform(true);
    resetTimer();

    if (reducedMotion) {
      normalizeRenderIndex();
    } else {
      clearTransitionWatchdog();
      transitionTimer = window.setTimeout(finishTransition, 480);
    }
  };

  const resetTimer = () => {
    clearInterval(timer);
    if (reducedMotion || pausedByVisibility || pausedByInteraction || dragging) return;
    timer = window.setInterval(() => requestMove(1), 3200);
  };

  track.addEventListener("transitionend", (event) => {
    if (event.target !== track || event.propertyName !== "transform") return;
    finishTransition();
  });

  prevButton.addEventListener("click", () => requestMove(-1));
  nextButton.addEventListener("click", () => requestMove(1));

  const startDrag = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (transitioning) return;
    dragging = true;
    pointerId = event.pointerId;
    dragStartX = event.clientX;
    dragLastX = event.clientX;
    baseTranslate = getTranslate();
    track.style.transition = "none";
    track.classList.add("is-dragging");
    viewport.setPointerCapture?.(event.pointerId);
    clearInterval(timer);
  };

  const moveDrag = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragLastX = event.clientX;
    const step = Math.max(1, getStep());
    const rawDelta = event.clientX - dragStartX;
    const limitedDelta = Math.max(-step * 1.15, Math.min(step * 1.15, rawDelta));
    setTransform(false, baseTranslate + limitedDelta);
  };

  const endDrag = (event) => {
    if (!dragging || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;
    const deltaX = (event.clientX ?? dragLastX) - dragStartX;
    const threshold = Math.min(55, getStep() * .18);
    dragging = false;
    track.classList.remove("is-dragging");
    viewport.releasePointerCapture?.(pointerId);
    pointerId = null;

    if (Math.abs(deltaX) >= threshold) {
      startMove(deltaX < 0 ? 1 : -1);
    } else {
      setTransform(true);
    }
    resetTimer();
  };

  viewport.addEventListener("pointerdown", startDrag);
  viewport.addEventListener("pointermove", moveDrag);
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("lostpointercapture", (event) => {
    if (dragging) endDrag(event);
  });

  slider.addEventListener("mouseenter", () => {
    pausedByInteraction = true;
    clearInterval(timer);
  });
  slider.addEventListener("mouseleave", () => {
    pausedByInteraction = false;
    resetTimer();
  });
  slider.addEventListener("focusin", () => {
    pausedByInteraction = true;
    clearInterval(timer);
  });
  slider.addEventListener("focusout", () => {
    pausedByInteraction = false;
    resetTimer();
  });

  document.addEventListener("visibilitychange", () => {
    pausedByVisibility = document.hidden;
    resetTimer();
  });

  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => setTransform(false));
  }, { passive: true });

  const testimonialImages = [...track.querySelectorAll("img")];
  Promise.all(testimonialImages.map((image) => {
    if (image.complete) return image.decode?.().catch(() => {}) || Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  })).finally(() => slider.classList.add("is-ready"));

  setTransform(false);
  resetTimer();
})();

// Contagem regressiva reiniciada a cada visita, como na página de referência.
(function initCountdown() {
  const hourElement = document.getElementById("hours");
  const minuteElement = document.getElementById("minutes");
  const secondElement = document.getElementById("seconds");
  if (!hourElement || !minuteElement || !secondElement) return;

  const durationInSeconds = 49 * 60 + 55;
  let remaining = durationInSeconds;

  const animateValue = (element, value) => {
    const formatted = String(value).padStart(2, "0");
    if (element.textContent === formatted) return;
    element.textContent = formatted;
    element.classList.remove("tick");
    void element.offsetWidth;
    element.classList.add("tick");
  };

  const renderCountdown = () => {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    animateValue(hourElement, hours);
    animateValue(minuteElement, minutes);
    animateValue(secondElement, seconds);

    remaining = remaining > 0 ? remaining - 1 : durationInSeconds;
  };

  renderCountdown();
  setInterval(renderCountdown, 1000);
})();

// Perguntas frequentes em formato sanfona.
document.querySelectorAll(".faq-item button").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const answer = item.querySelector(".faq-answer");
    const willOpen = !item.classList.contains("open");

    document.querySelectorAll(".faq-item.open").forEach((openItem) => {
      if (openItem === item) return;
      openItem.classList.remove("open");
      openItem.querySelector("button")?.setAttribute("aria-expanded", "false");
      openItem.querySelector(".faq-answer").style.maxHeight = "0px";
    });

    item.classList.toggle("open", willOpen);
    button.setAttribute("aria-expanded", String(willOpen));
    answer.style.maxHeight = willOpen ? `${answer.scrollHeight}px` : "0px";
  });
});

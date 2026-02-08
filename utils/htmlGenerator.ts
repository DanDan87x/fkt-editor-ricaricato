
import { ProtocolData, SlideType, ProtocolSlide, SectionType, SlideSection } from "../types";

export const generateHTML = (data: ProtocolData): string => {
  
  const renderSection = (section: SlideSection) => {
    switch (section.type) {
      case SectionType.OBJECTIVES:
        return `
          <div class="objectives-box">
            <h3>${section.title || 'Obiettivi'}</h3>
            <ul>${section.items.map(i => `<li>${i.text}</li>`).join('')}</ul>
          </div>`;
      
      case SectionType.CRITERIA:
        return `
          <div class="criteria-box">
            <h3>${section.title || 'Criteri di passaggio'}</h3>
            <ul class="criteria-list">${section.items.map(i => `<li><span>${i.text}</span></li>`).join('')}</ul>
          </div>`;
      
      case SectionType.EXERCISES:
        return `
          <div class="esercizi-titolo">${section.title || 'Esercizi consigliati'}</div>
          <ul class="standard-list">${section.items.map(i => `<li>${i.text}</li>`).join('')}</ul>`;
      
      case SectionType.INFO:
        return `
          <div class="info-box">
            <h3>${section.title || 'Informazioni utili'}</h3>
            <ul>${section.items.map(i => `<li>${i.text}</li>`).join('')}</ul>
          </div>`;

      case SectionType.PRECAUTIONS:
         return `
          <div class="info-box" style="border-left-color: #dc3545; background: #fff5f5;">
            <h3 style="color: #dc3545;">${section.title || 'Precauzioni'}</h3>
            <ul>${section.items.map(i => `<li>${i.text}</li>`).join('')}</ul>
          </div>`;
      
      case SectionType.WARNING: 
         return `
          <div class="attention-box">
            <h3>${section.title || 'Attenzione'}</h3>
            <ul>${section.items.map(i => `<li>${i.text}</li>`).join('')}</ul>
          </div>`;

      case SectionType.VIDEO:
          return `
            <div class="video-section">
                ${section.title ? `<h3 class="video-title">${section.title}</h3>` : ''}
                ${section.items.map(item => {
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
                    const match = item.text.match(regExp);
                    const videoId = (match && match[2].length === 11) ? match[2] : null;
                    if (!videoId) return '';
                    return `
                    <div class="video-wrapper">
                        <div class="video-container">
                            <iframe 
                                src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0" 
                                title="YouTube video player" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                referrerpolicy="strict-origin-when-cross-origin"
                                allowfullscreen>
                            </iframe>
                        </div>
                        ${item.description ? `<p class="video-caption">${item.description}</p>` : ''}
                    </div>`;
                }).join('')}
            </div>`;

      case SectionType.GENERIC_LIST:
      default:
         return `
          <div class="checklist-box">
            <h3>${section.title}</h3>
            <ul class="checklist-list">${section.items.map(i => `<li>${i.text}</li>`).join('')}</ul>
          </div>`;
    }
  };

  const generateSlideHTML = (slide: ProtocolSlide, index: number) => {
    const widthStyle = slide.customWidth ? `max-width: ${slide.customWidth}px;` : 'max-width: 700px;';
    const heightStyle = slide.customHeight ? `min-height: ${slide.customHeight}px;` : 'min-height: 510px;';
    const bgStyle = slide.backgroundColor ? `background-color: ${slide.backgroundColor};` : 'background-color: #ffffff;';
    const transitionStyles = `style="${widthStyle} ${heightStyle} ${bgStyle} overflow: hidden;"`;
    const cardStyles = `style="${widthStyle} ${heightStyle} ${bgStyle}"`;

    switch (slide.type) {
      case SlideType.TRANSITION:
        return `
      <div class="swiper-slide">
        <div class="transition-card" data-img="${slide.imageUrl || ''}" ${transitionStyles}>
          <img src="${slide.imageUrl || 'https://picsum.photos/800/600'}" alt="${slide.title || 'Transizione'}">
        </div>
      </div>`;

      case SlideType.PHASE:
      case SlideType.FINAL:
        return `
      <div class="swiper-slide">
        <section class="phase-card" ${cardStyles}>
          <h2 class="phase-title">${slide.title || 'Titolo'}</h2>
          ${slide.sections.map(renderSection).join('')}
        </section>
      </div>`;

      case SlideType.WARNING:
        return `
      <div class="swiper-slide">
        <section class="phase-card" ${cardStyles}>
          <h2 class="phase-title">${slide.title || 'Segnali di allarme'}</h2>
          <div class="attention-box">
             ${slide.sections.map(s => `<ul>${s.items.map(i => `<li>${i.text}</li>`).join('')}</ul>`).join('')}
             <div style="font-weight:600; margin-top:1.1em;">Contattare tempestivamente il medico in caso di questi sintomi.</div>
          </div>
        </section>
      </div>`;
      
      default:
        return '';
    }
  };

  const phaseSlidesIndices: number[] = [];
  const exercisesByPhaseJS: string[] = [];

  data.slides.forEach((slide, index) => {
    if ((slide.type === SlideType.PHASE || slide.type === SlideType.FINAL) && slide.sections) {
        const exerciseSections = slide.sections.filter(s => s.type === SectionType.EXERCISES);
        const galleryItems = exerciseSections.flatMap(s => s.items.filter(i => !!i.img));
        if (galleryItems.length > 0) {
            phaseSlidesIndices.push(index);
            const items = galleryItems.map(ex => {
                const safeName = ex.text.replace(/"/g, '\\"');
                const safeDesc = (ex.description || '').replace(/"/g, '\\"').replace(/\n/g, '<br>');
                return `{ name: "${safeName}", img: "${ex.img}", desc: "${safeDesc}" }`;
            }).join(',\n        ');
            exercisesByPhaseJS.push(`[\n        ${items}\n      ]`);
        }
    }
  });

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${data.protocolTitle} | ${data.doctorName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.css" />
  <style>
    :root {
      --primary-color: #166bbf;
      --accent-color: #2596e5;
      --secondary-color: #406185;
      --success-color: #2e7d32;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Poppins', sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #f8f9fa; line-height: 1.6; color: #333; }
    img { -webkit-user-drag: none; user-select: none; pointer-events: auto; max-width: 100%; }

    .protocol-header {
      background: linear-gradient(25deg, var(--primary-color), var(--accent-color));
      color: white;
      padding: 1.65rem;
      text-align: center;
      position: relative;
      overflow: hidden;
      min-height: 110px;
    }
    .protocol-header h1 { font-size: 1.8rem; margin: 0 0 0.3rem; text-shadow: 0 0.5px 1px rgba(0,0,0,0.15); text-transform: uppercase; }
    .protocol-header p { font-size: 1.1rem; margin: 0; opacity: 0.95; }
    .header-logo { width: 156px; height: auto; position: absolute; top: 0.2rem; right: 0.5rem; filter: drop-shadow(0 0.5px 1px rgba(0,0,0,0.15)); }
    
    .mySwiper { max-width: 1200px; margin: 2rem auto; padding: 0 1rem; position: relative; }
    .swiper-slide { display: flex; justify-content: center; align-items: flex-start; }
    
    .phase-card {
      background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      padding: 2rem 2.5rem; margin: 1rem auto; width: 100%; min-height: 510px;
      transition: all 0.3s ease;
      overflow-wrap: break-word;
      word-break: break-word;
      overflow: visible;
    }
    .phase-title {
      color: var(--primary-color); border-bottom: 3px solid var(--accent-color);
      padding-bottom: 0.5rem; margin-bottom: 1.5rem; font-size: 1.4rem;
    }

    /* List Alignment and Overflow Prevention */
    ul {
        margin: 0.5rem 0 1.25rem 2.25rem; /* Increased left margin for bullet alignment */
        padding: 0;
        list-style-position: outside;
        width: calc(100% - 2.5rem); /* Force lists to stay within card bounds */
    }
    li {
        margin-bottom: 0.6rem;
        padding-left: 0.5rem;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    
    .objectives-box { background: #e8f5e9; border-left: 5px solid var(--success-color); padding: 1.25rem 1.5rem; margin: 1.5rem 0; border-radius: 6px; }
    .objectives-box h3 { margin-bottom: 0.75rem; color: var(--success-color); font-size: 1.2rem; margin-top: 0; font-weight: 600; }
    .objectives-box ul { margin-bottom: 0; margin-left: 1.5rem; width: auto; }
    
    .criteria-box { background: #fffcf0; border: 1px dashed #ffd54f; padding: 1.25rem 1.5rem; margin: 1.5rem 0; border-radius: 8px; }
    .criteria-box h3 { margin-bottom: 1rem; color: #f57f17; font-size: 1.15rem; display: flex; align-items: center; gap: 10px; margin-top: 0; font-weight: 600; }
    .criteria-box h3::before { content: '✔️'; font-size: 0.9em; }
    .criteria-list { list-style: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    .criteria-list li { position: relative; padding-left: 32px; margin-bottom: 12px; font-size: 0.95rem; font-weight: 600; color: #5d4037; }
    .criteria-list li::before { content: ''; position: absolute; left: 0; top: 4px; width: 18px; height: 18px; border: 2px solid #ffd54f; border-radius: 4px; background: white; }

    .info-box { background: #e2f0fb; border-left: 5px solid #2596e5; padding: 1.25rem 1.5rem; margin: 1.5rem 0; border-radius: 6px; }
    .info-box h3 { margin-bottom: 0.75rem; color: var(--secondary-color); font-size: 1.2rem; margin-top: 0; font-weight: 600; }
    .info-box ul { margin-bottom: 0; margin-left: 1.5rem; width: auto; }

    .attention-box { background: #f8d7da; border-left: 5px solid #dc3545; padding: 1.25rem 1.5rem; margin: 1.5rem 0; border-radius: 6px; color: #721c24; }
    .attention-box h3 { margin-bottom: 0.75rem; color: #d00; font-size: 1.2rem; margin-top: 0; font-weight: 600; }
    .attention-box ul { margin-bottom: 0; margin-left: 1.5rem; width: auto; }
    
    .esercizi-titolo { font-weight: 600; color: var(--primary-color); margin-top: 2rem; margin-bottom: 0.75rem; font-size: 1.2rem; }
    .standard-list { list-style-type: disc; }

    .checklist-box { background: white; border: 1px solid #eee; padding: 1.25rem 1.5rem; margin: 1.5rem 0; border-radius: 6px; }
    .checklist-list { list-style-type: square; }
    
    .exercise-gallery { max-width: 1200px; margin: 2rem auto; padding: 1rem; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    footer { text-align: center; padding: 3rem; color: var(--secondary-color); font-size: 0.9rem; }
    
    @media (max-width: 768px) {
      .protocol-header { padding: 1.65rem; min-height: 100px; }
      .header-logo { position: relative; top: auto; right: auto; margin: 0 auto 0.5rem; display: block; width: 120px; }
      .protocol-header h1 { font-size: 1.2rem; }
      .phase-card { padding: 1.5rem; }
      ul { margin-left: 1.5rem; width: calc(100% - 1.5rem); }
    }
  </style>
</head>
<body>
  <header class="protocol-header">
    <img src="${data.logoUrl}" alt="${data.doctorName}" class="header-logo">
    <h1>${data.protocolTitle}</h1>
    <p>${data.doctorName}</p>
  </header>
  <div class="mySwiper">
    <div class="swiper-wrapper">
      ${data.slides.map(generateSlideHTML).join('')}
    </div>
    <div class="swiper-button-prev"></div>
    <div class="swiper-button-next"></div>
  </div>
  <footer>
    <p>&copy; <span id="copyrightYear"></span> <strong>${data.doctorName}</strong>. Tutti i diritti riservati.</p>
  </footer>
  <script src="https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.js"></script>
  <script>
    document.getElementById('copyrightYear').textContent = new Date().getFullYear();
    const swiper = new Swiper('.mySwiper', {
      slidesPerView: 1,
      spaceBetween: 30,
      autoHeight: true,
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      speed: 600,
    });
  </script>
</body>
</html>`;
};

export const generatePrintableHTML = (data: ProtocolData): string => {
    const renderPrintSection = (section: SlideSection) => {
        const titleHtml = section.title ? `<h4 class="section-title ${section.type.toLowerCase()}">${section.title}</h4>` : '';
        
        if (section.type === SectionType.CRITERIA) {
            return `
            <div class="print-section criteria-print">
                ${titleHtml}
                <ul class="criteria-list-print">
                    ${section.items.map(i => `<li>[ ] ${i.text}</li>`).join('')}
                </ul>
            </div>`;
        }

        if (section.type === SectionType.EXERCISES) {
            return `
            <div class="print-section">
                ${titleHtml}
                <div class="exercise-list">
                    ${section.items.map(item => `
                        <div class="exercise-item">
                            ${item.img ? `<div class="ex-img-container"><img src="${item.img}" alt="${item.text}"></div>` : ''}
                            <div class="ex-content">
                                <strong>${item.text}</strong>
                                ${item.description ? `<p>${item.description}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
        
        return `
            <div class="print-section">
                ${titleHtml}
                <ul class="simple-list">
                    ${section.items.map(i => `<li>${i.text}</li>`).join('')}
                </ul>
            </div>`;
    };

    const renderSlide = (slide: ProtocolSlide) => {
        if (slide.type === SlideType.TRANSITION) {
            return `
            <div class="print-slide transition-slide">
                ${slide.imageUrl ? `<img src="${slide.imageUrl}" class="transition-img" />` : ''}
                ${slide.title && slide.title !== 'Transition' ? `<h2>${slide.title}</h2>` : ''}
            </div>`;
        }
        return `
        <div class="print-slide content-slide">
            <h3 class="slide-title ${slide.type === SlideType.WARNING ? 'warning' : ''}">${slide.title}</h3>
            ${slide.sections.map(renderPrintSection).join('')}
        </div>`;
    };

    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>${data.protocolTitle}</title>
    <style>
        @page { size: A4; margin: 1.5cm; }
        body { font-family: sans-serif; color: #111; line-height: 1.4; padding: 0; margin: 0 auto; max-width: 210mm; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #166bbf; padding-bottom: 15px; margin-bottom: 20px; }
        .header-text h1 { margin: 0; font-size: 20px; color: #166bbf; text-transform: uppercase; }
        .print-slide { margin-bottom: 25px; break-inside: avoid; }
        .slide-title { font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; color: #333; }
        .section-title { font-size: 12px; margin: 10px 0 5px; text-transform: uppercase; color: #555; }
        .criteria-print { background: #fdfdfd; border: 1px solid #eee; padding: 10px; border-radius: 4px; }
        .criteria-list-print { list-style: none; padding: 0; font-size: 11px; font-weight: bold; }
        .criteria-list-print li { margin-bottom: 4px; color: #333; }
        .exercise-item { display: flex; gap: 10px; align-items: flex-start; background: #f9f9f9; padding: 8px; border-radius: 4px; border: 1px solid #eee; margin-bottom: 5px; }
        .ex-img-container { width: 60px; }
        .ex-img-container img { width: 100%; border-radius: 3px; }
        .ex-content { font-size: 11px; }
        .footer { margin-top: 30px; border-top: 1px solid #eee; text-align: center; font-size: 9px; color: #888; }
    </style>
</head>
<body onload="window.print()">
    <div class="header">
        <div class="header-text">
            <h1>${data.protocolTitle}</h1>
            <p>${data.doctorName}</p>
        </div>
        ${data.logoUrl ? `<img src="${data.logoUrl}" style="max-height: 50px;" alt="Logo">` : ''}
    </div>
    ${data.slides.map(renderSlide).join('')}
    <div class="footer">MediProto Builder - ${new Date().getFullYear()}</div>
</body>
</html>`;
};

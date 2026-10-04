// @ts-nocheck

import { AfterViewInit, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-itil-dashboard',
  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './itil-dashboard.component.html',
  styleUrl: './itil-dashboard.component.css'
})

export class ItilDashboardComponent implements AfterViewInit {

  /* =========================================================
     PROCESO ACTUAL / CON LA PLATAFORMA
     ========================================================= */

  proceso: 'actual' | 'plataforma' = 'actual';

  personas = Array.from({ length: 10 });

  cambiarProceso(tipo: 'actual' | 'plataforma'): void {
    this.proceso = tipo;
  }


  ngAfterViewInit(): void {

    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];


    /* =========================================================
       NAVEGACIÓN
       ========================================================= */

    function showView(id) {

      $$('nav.tabs button').forEach(b =>
        b.setAttribute(
          'aria-selected',
          b.dataset.view === id
        )
      );

      $$('section.view').forEach(s =>
        s.hidden = s.id !== id
      );
    }


    function showSub(id) {

      $$('.subtabs button').forEach(b =>
        b.setAttribute(
          'aria-selected',
          b.dataset.sub === id
        )
      );

      $$('.sub').forEach(s =>
        s.hidden = s.id !== 'sub-' + id
      );
    }


    $$('nav.tabs button').forEach(
      b => b.onclick = () => showView(b.dataset.view)
    );


    $$('.subtabs button').forEach(
      b => b.onclick = () => showSub(b.dataset.sub)
    );


    $$('[data-go]').forEach(b => b.onclick = () => {

      const [v, s] = b.dataset.go.split(':');

      showView(v);

      if (s) {
        showSub(s);
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

    });


    /* =========================================================
       ROLES
       ========================================================= */

    const roles = [

      [
        'Product Owner',
        'Valida entregas según la necesidad del cliente'
      ],

      [
        'Scrum Master / PM',
        'Gestiona cronograma, riesgos y ceremonias ágiles'
      ],

      [
        'Arquitecto de Soluciones',
        'Define la arquitectura cloud escalable y de alta disponibilidad'
      ],

      [
        'Tech Lead',
        'Coordina desarrolladores y decisiones técnicas diarias'
      ],

      [
        'Desarrolladores Backend/Frontend',
        'Construyen APIs e interfaz web/app'
      ],

      [
        'Especialista en Integración',
        'Conecta sistemas heterogéneos de farmacias'
      ],

      [
        'Seguridad de la Información',
        'Cumplimiento normativo y protección de datos'
      ]

    ];


    if ($('#roles')) {

      $('#roles').innerHTML = roles
        .map(r => `
          <div class="role">
            <b>${r[0]}</b>
            <span>${r[1]}</span>
          </div>
        `)
        .join('');

    }


    /* =========================================================
       ADKAR GANTT
       ========================================================= */

    const adkar = [

      {
        n: '1. Conciencia',
        from: 1,
        to: 1,
        dur: 'Mes 1',
        p: 'Enfocarse en el valor',
        a: 'Mensaje de la dirección sobre por qué cambiar (filas, quejas, tutelas, riesgo para el paciente). Socialización de datos reales de tiempos de espera.'
      },

      {
        n: '2. Deseo',
        from: 1,
        to: 2,
        dur: 'Mes 1 a 2',
        p: 'Colaborar y promover la visibilidad',
        a: 'Selección de agentes de cambio (un regente líder por región). Talleres de co-diseño de pantallas y flujos con el personal.'
      },

      {
        n: '3. Conocimiento',
        from: 2,
        to: 3,
        dur: 'Mes 2 a 3',
        p: 'Mantenerlo simple y práctico',
        a: 'Formación por perfiles: básica (consulta y registro), avanzada (ajustes de inventario, alertas) y contingencia (modo offline). Microvideos de 3 a 5 minutos y guías de bolsillo.'
      },

      {
        n: '4. Habilidad',
        from: 3,
        to: 5,
        dur: 'Mes 3 a 5',
        p: 'Progresar iterativamente con retroalimentación',
        a: 'Piloto en 5 a 10 farmacias de alto volumen. Acompañamiento en sitio (hypercare) de 2 semanas por sede. Despliegue por oleadas regionales.'
      },

      {
        n: '5. Refuerzo',
        from: 6,
        to: 7,
        dur: 'Mes 6 en adelante',
        p: 'Optimizar y automatizar',
        a: 'Reconocimiento a sedes con mejor adopción. Tableros de desempeño visibles. Retiro definitivo de formatos manuales.'
      }

    ];


    if ($('#gantt')) {

      let g =
        '<div class="grow head"><div>Fase</div>' +

        [1, 2, 3, 4, 5, 6, '7+']
          .map(m => `<div>Mes ${m}</div>`)
          .join('') +

        '</div>';


      adkar.forEach((f, i) => {

        g += `
          <div class="grow" data-i="${i}">
            <button class="lbl" data-i="${i}">
              ${f.n}
            </button>
        `;


        for (let m = 1; m <= 7; m++) {

          if (m === f.from) {

            g += `
              <div
                class="bar"
                data-i="${i}"
                style="grid-column:span ${f.to - f.from + 1}"
                title="${f.dur}">
              </div>
            `;

          }

          else if (m < f.from || m > f.to) {

            g += '<div></div>';

          }

        }

        g += '</div>';

      });


      $('#gantt').innerHTML = g;


      function setAdkar(i) {

        $$('.grow[data-i]').forEach(r =>
          r.classList.toggle(
            'active',
            +r.dataset.i === i
          )
        );


        const f = adkar[i];


        $('#ganttDetail').innerHTML = `
          <h3>
            ${f.n}
            <span class="small muted">
              (${f.dur})
            </span>
          </h3>

          <p class="small">
            ${f.a}
          </p>

          <span class="tag amber">
            Principio ITIL 4: ${f.p}
          </span>
        `;

      }


      $$('#gantt [data-i]').forEach(el =>
        el.addEventListener(
          'click',
          () => setAdkar(+el.dataset.i)
        )
      );


      setAdkar(0);

    }


    /* =========================================================
       PICKER GENÉRICO
       ========================================================= */

    function picker(
      optsSel,
      outSel,
      data,
      render
    ) {

      const o = $(optsSel);

      if (!o || !$(outSel)) {
        return;
      }


      o.innerHTML = data
        .map((d, i) => `
          <button
            aria-pressed="false"
            data-i="${i}">
            ${d.t}
          </button>
        `)
        .join('');


      const set = i => {

        o.querySelectorAll('button')
          .forEach(b =>
            b.setAttribute(
              'aria-pressed',
              +b.dataset.i === i
            )
          );


        $(outSel).innerHTML =
          render(data[i]);

      };


      o.querySelectorAll('button')
        .forEach(
          b => b.onclick = () =>
            set(+b.dataset.i)
        );


      set(0);

    }


    /* =========================================================
       RESISTENCIAS
       ========================================================= */

    picker(
      '#resOpts',
      '#resOut',

      [

        {
          t: '"El sistema me va a reemplazar"',
          c: 'Miedo a perder el empleo',
          r: 'Comunicar que el objetivo es quitar filas, no personas; el rol evoluciona hacia orientación al paciente.'
        },

        {
          t: '"No sé usar tecnología"',
          c: 'Brecha digital, sobre todo en municipios pequeños',
          r: 'Formación práctica por niveles y acompañamiento en sitio.'
        },

        {
          t: '"Registrar en el sistema me quita tiempo"',
          c: 'Doble trabajo durante la transición',
          r: 'Diseño simple (escáner de código de barras, pocos clics) y eliminación del registro en papel.'
        },

        {
          t: '"Siempre lo hemos hecho así"',
          c: 'Hábito y desconfianza en cambios anteriores fallidos',
          r: 'Piloto visible con resultados medibles y participación de líderes locales.'
        }

      ],

      d => `
        <dt>Resistencia</dt>
        <dd><b>${d.t}</b></dd>

        <dt>Causa probable</dt>
        <dd>${d.c}</dd>

        <dt>Respuesta del plan</dt>
        <dd>${d.r}</dd>
      `
    );


    /* =========================================================
       KPIs DE ADOPCIÓN
       ========================================================= */

    const adopt = [

      [
        'Personal operativo capacitado y certificado',
        '≥ 95% antes del despliegue en su sede',
        95
      ],

      [
        'Dispensaciones registradas en la plataforma',
        '≥ 98% al mes 2 de cada sede',
        98
      ],

      [
        'Exactitud del inventario (sistema vs. conteo físico)',
        '≥ 97%',
        97
      ],

      [
        'Tiempo de actualización tras una dispensación',
        '≤ 5 minutos',
        null
      ],

      [
        'Incidentes por error de usuario',
        'Tendencia decreciente mes a mes',
        null
      ],

      [
        'Satisfacción del personal con la herramienta',
        '≥ 4 / 5',
        80
      ]

    ];


    if ($('#adopt')) {

      $('#adopt').innerHTML = adopt
        .map(a => `

          <div class="meter">

            <div class="row">

              <span>
                ${a[0]}
              </span>

              <b style="white-space:nowrap">
                ${a[1]}
              </b>

            </div>

            ${
              a[2]
                ? `
                  <div class="track">
                    <div
                      class="val"
                      style="width:${a[2]}%">
                    </div>
                  </div>
                `
                : ''
            }

          </div>

        `)
        .join('');

    }


    /* =========================================================
       ARQUITECTURA
       ========================================================= */

    const arch = [

      {
        l: 'Usuarios',

        n: [

          {
            t: 'App móvil iOS/Android',
            s: 'Paciente',
            d: 'Aplicación multiplataforma enfocada en la experiencia del usuario: el paciente consulta su fórmula y ve la disponibilidad en las farmacias aliadas más cercanas por geolocalización.'
          },

          {
            t: 'Portal web responsive',
            s: 'Paciente',
            d: 'Misma consulta y reserva desde el navegador, con diseño responsive.'
          },

          {
            t: 'Portal operativo',
            s: 'Farmacia',
            d: 'Permite a los administradores de farmacia ver en tiempo real las reservas de los pacientes.'
          }

        ]

      },

      {
        l: 'Middleware',

        n: [

          {
            t: 'API Gateway',
            s: 'Orquestación',
            d: 'Punto único que orquesta la comunicación entre las interfaces y los servicios internos. Aquí se mide el tiempo de respuesta (APM) del SLA.'
          },

          {
            t: 'GraphQL',
            s: 'App móvil',
            d: 'Las consultas de la app piden solo la disponibilidad exacta de un medicamento, lo que optimiza el consumo de datos.'
          },

          {
            t: 'APIs RESTful',
            s: 'Farmacias aliadas',
            d: 'Integran y sincronizan en tiempo real los inventarios (ERP/WMS) de las farmacias aliadas con la plataforma central de la EPS.'
          }

        ]

      },

      {
        l: 'Back-end cloud',

        n: [

          {
            t: 'AWS + Kubernetes',
            s: 'Auto-escalado',
            d: 'Contenedores con políticas de auto-escalado para soportar picos de demanda (inicio de mes, entrega de crónicos) sin caídas del servicio.'
          },

          {
            t: 'PostgreSQL',
            s: 'Base relacional',
            d: 'Gestiona de forma segura las fórmulas y las transacciones de reservas; datos cifrados en reposo con AES-256.'
          },

          {
            t: 'Redis',
            s: 'Caché',
            d: 'Acelera las consultas de inventario repetitivas y ayuda a mantener la latencia por debajo de 2 segundos (menos de 50 ms en caché).'
          }

        ]

      }

    ];


    if ($('#arch')) {

      $('#arch').innerHTML = arch
        .map(
          (L, li) =>

            (
              li
                ? '<div class="flowarrow" aria-hidden="true">▼</div>'
                : ''
            )

            +

            `
            <div class="layer">

              <div class="ln">
                ${L.l}
              </div>

              <div class="nodes">

                ${L.n.map(
                  (n, ni) => `

                    <button
                      class="node"
                      aria-pressed="false"
                      data-k="${li}-${ni}">

                      <b>${n.t}</b>

                      <span>
                        ${n.s}
                      </span>

                    </button>

                  `
                ).join('')}

              </div>

            </div>
            `

        )
        .join('');


      function setArch(k) {

        $$('.node').forEach(
          b => b.setAttribute(
            'aria-pressed',
            b.dataset.k === k
          )
        );


        const [a, b] =
          k.split('-').map(Number);

        const n =
          arch[a].n[b];


        $('#archOut').innerHTML = `

          <span class="tag blue">
            ${arch[a].l}
          </span>

          <h3 style="margin:8px 0 6px">
            ${n.t}
          </h3>

          <p class="small">
            ${n.d}
          </p>

        `;

      }


      $$('.node').forEach(
        b => b.onclick =
          () => setArch(b.dataset.k)
      );


      setArch('1-0');


      const mq =
        window.matchMedia(
          '(max-width:820px)'
        );


      const archLayout = () => {

        if ($('#archGrid')) {

          $('#archGrid').style.gridTemplateColumns =
            mq.matches
              ? '1fr'
              : 'minmax(0,1.5fr) minmax(0,1fr)';

        }

      };


      if (mq.addEventListener) {

        mq.addEventListener(
          'change',
          archLayout
        );

      }

      else {

        mq.addListener(
          archLayout
        );

      }


      archLayout();

    }


    /* =========================================================
       PROVEEDORES
       ========================================================= */

    picker(
      '#provOpts',
      '#provOut',

      [

        {
          t: 'Infraestructura cloud',
          k: 'Estratégico',
          c: 'Microsoft Azure o Amazon Web Services (AWS). Referencias: Google Compute Engine, Azure Virtual Machines, Amazon EC2.',
          sv: 'Cómputo con autoescalado, bases de datos gestionadas, balanceadores de carga, colas de mensajes para sincronizar inventarios y almacenamiento de respaldos. Despliegue en al menos dos zonas de disponibilidad y una región secundaria para recuperación ante desastres.',
          w: 'Soporta los picos de demanda (inicio de mes, entrega de fórmulas crónicas) sin caída del servicio.',
          x: 'Los datos de salud son sensibles (Ley 1581 de 2012). Si se alojan fuera de Colombia, aplica el régimen de transferencia internacional que vigila la SIC, con cifrado en tránsito y en reposo.'
        },

        {
          t: 'Operadores de telecomunicaciones',
          k: 'Táctico',
          c: 'Claro, Movistar, Tigo y WOM en zonas urbanas; proveedores satelitales para sedes rurales o apartadas.',
          sv: 'Internet dedicado o banda ancha en cada farmacia, redes privadas (SD-WAN/VPN) hacia la plataforma y datos móviles como respaldo.',
          w: 'Si la farmacia no se conecta, su inventario deja de actualizarse y el paciente ve información desactualizada.',
          x: 'SLA exigido: disponibilidad ≥ 99,5% por sede y restauración ≤ 4 horas en sedes críticas.'
        },

        {
          t: 'Pasarelas SMS y WhatsApp',
          k: 'Táctico',
          c: 'WhatsApp Business Platform de Meta a través de un BSP (Twilio, Infobip o Gupshup); agregadores de SMS con cobertura nacional.',
          sv: 'Aviso de medicamento disponible, recordatorios de entrega, turno digital y chatbot de consulta.',
          w: 'Es el canal que realmente reduce las filas: el paciente solo se desplaza cuando hay medicamento.',
          x: 'Autorización previa del usuario y ningún dato clínico detallado en el mensaje (solo "tiene una novedad, ingrese a la app").'
        }

      ],

      d => `

        <span class="tag ${d.k === 'Estratégico' ? '' : 'amber'}">
          ${d.k}
        </span>

        <dt>Proveedores candidatos</dt>
        <dd>${d.c}</dd>

        <dt>Servicios requeridos</dt>
        <dd>${d.sv}</dd>

        <dt>Por qué es crítico</dt>
        <dd>${d.w}</dd>

        <dt>Condición legal o de servicio</dt>
        <dd>${d.x}</dd>

      `
    );


    /* =========================================================
       OUTSOURCING VS IN-HOUSE
       ========================================================= */

    const crit = [

      [
        'Cobertura 24/7',
        'O',
        'Fácil con turnos del proveedor',
        'Costosa: varios turnos propios'
      ],

      [
        'Escalabilidad en picos',
        'O',
        'El proveedor sube o baja agentes',
        'El personal fijo no crece rápido'
      ],

      [
        'Costo',
        'O',
        'Variable y predecible por contrato',
        'Fijo y alto'
      ],

      [
        'Conocimiento del negocio de salud',
        'I',
        'Bajo al inicio',
        'Alto: procesos, norma y cultura'
      ],

      [
        'Control y confidencialidad de datos',
        'I',
        'Menor; requiere cláusulas y auditorías',
        'Mayor control directo'
      ],

      [
        'Velocidad en fallas complejas',
        'I',
        'Limitada; debe escalar',
        'Alta: conoce la arquitectura'
      ],

      [
        'Rotación de personal',
        'I',
        'Alta en centros de contacto',
        'Menor y más controlable'
      ]

    ];


    const W =
      crit.map(() => 3);


    if ($('#weights')) {

      $('#weights').innerHTML =

        `
        <div
          class="wrow small muted"
          style="border-top:0">

          <span>
            Criterio (favorece a)
          </span>

          <span>
            Importancia
          </span>

          <span></span>

        </div>
        `

        +

        crit.map(
          (c, i) => `

            <div class="wrow">

              <span>

                <b>
                  ${c[0]}
                </b>

                <br>

                <span class="muted small">

                  ${
                    c[1] === 'O'
                      ? 'Outsourcing: ' + c[2]
                      : 'In house: ' + c[3]
                  }

                </span>

              </span>

              <input
                type="range"
                min="1"
                max="5"
                value="3"
                data-i="${i}"
                aria-label="Importancia de ${c[0]}">

              <span
                class="tag ${c[1] === 'O' ? 'blue' : ''}"
                id="w${i}">

                ${
                  c[1] === 'O'
                    ? 'Outsourcing'
                    : 'In house'
                } (3)

              </span>

            </div>

          `
        ).join('');


      function verdict() {

        let o = 0;
        let h = 0;


        crit.forEach(
          (c, i) =>
            c[1] === 'O'
              ? o += W[i]
              : h += W[i]
        );


        const t = o + h;

        const po =
          Math.round(o / t * 100);

        const ph =
          100 - po;


        $('#verdict').innerHTML = `

          <div class="${po > ph ? 'win' : ''}">

            <span class="small">
              Outsourcing
            </span>

            <b>
              ${po}%
            </b>

          </div>


          <div class="${ph > po ? 'win' : ''}">

            <span class="small">
              Equipo in house
            </span>

            <b>
              ${ph}%
            </b>

          </div>

        `;

      }


      $$('#weights input')
        .forEach(r =>

          r.oninput = () => {

            const i =
              +r.dataset.i;

            W[i] =
              +r.value;


            $('#w' + i).textContent =

              (
                crit[i][1] === 'O'
                  ? 'Outsourcing'
                  : 'In house'
              )

              +

              ' (' + r.value + ')';


            verdict();

          }

        );


      verdict();

    }


    /* =========================================================
       FLUJO DE VALOR
       ========================================================= */

    const vs = {

      asis: {

        note:
          'Situación actual descrita en el diagnóstico: proceso manual, descentralizado y sin visibilidad del inventario. En rojo, las actividades que no agregan valor.',

        s: [

          [
            'Fórmula emitida en consulta',
            'Queda en papel o en el sistema de la IPS, sin llegar a la farmacia.',
            0
          ],

          [
            'Desplazamiento a ciegas',
            'El paciente va a la sede sin saber si hay stock.',
            1
          ],

          [
            'Fila presencial',
            'Larga espera para ser atendido.',
            1
          ],

          [
            'Verificación manual en ventanilla',
            'Revisión de la fórmula y consulta por llamada o estantería (≈15 min).',
            1
          ],

          [
            'Entrega o nuevo viaje',
            'Si no hay medicamento, el paciente debe volver.',
            1
          ]

        ]

      },


      tobe: {

        note:
          'Flujo propuesto: la fórmula viaja sola a la plataforma y el paciente llega con turno asegurado.',

        s: [

          [
            'Emisión de fórmula',
            'En la consulta médica.',
            0
          ],

          [
            'Sincronización automática',
            'La fórmula llega a la plataforma de la EPS.',
            0
          ],

          [
            'Consulta de stock',
            'El paciente revisa disponibilidad desde la app o WhatsApp.',
            0
          ],

          [
            'Reserva y turno QR',
            'Se aparta el medicamento y se asigna turno.',
            0
          ],

          [
            'Reclamo FastTrack',
            'Entrega en farmacia escaneando el QR.',
            0
          ]

        ]

      }

    };


    function setVS(k) {

      $$('[data-vs]').forEach(
        b => b.setAttribute(
          'aria-pressed',
          b.dataset.vs === k
        )
      );


      if ($('#vsNote')) {

        $('#vsNote').textContent =
          vs[k].note;

      }


      if ($('#steps')) {

        $('#steps').innerHTML =
          vs[k].s
            .map(
              (s, i) => `

                <div class="step ${s[2] ? 'waste' : ''}">

                  <span class="k">
                    ${i + 1}
                  </span>

                  <b style="display:block">
                    ${s[0]}
                  </b>

                  <p>
                    ${s[1]}
                  </p>

                </div>

              `
            )
            .join('');

      }

    }


    $$('[data-vs]').forEach(
      b => b.onclick =
        () => setVS(b.dataset.vs)
    );


    setVS('tobe');


    /* =========================================================
       PRINCIPIOS ITIL
       ========================================================= */

    const P = [

      {
        es: 'Enfocarse en el valor',
        en: 'Focus on Value',
        d: 'Módulo de consulta en tiempo real, Turno Digital QR y entrega a domicilio para pacientes crónicos.',
        i: 'Paciente: ahorro de más de 2 horas en filas. EPS: reducción del 60% en PQR por demoras y optimización de costos operacionales.'
      },

      {
        es: 'Empezar donde se está',
        en: 'Start Where You Are',
        d: 'Conexión con los ERP/POS existentes de las farmacias aliadas mediante APIs y CDC (Change Data Capture), sin reemplazarlos.',
        i: 'Despliegue 70% más rápido, menor costo de infraestructura e interferencia mínima en la operación diaria.'
      },

      {
        es: 'Progresar iterativamente con retroalimentación',
        en: 'Progress Iteratively with Feedback',
        d: 'MVP v1.0 en Bogotá y Medellín con consulta de saldo y reservas, más encuesta CSAT de 1 clic después de la entrega.',
        i: 'Ajuste continuo basado en el comportamiento real de los usuarios antes de escalar a nivel nacional.'
      },

      {
        es: 'Colaborar y promover la visibilidad',
        en: 'Collaborate & Promote Visibility',
        d: 'Dashboards en tiempo real (Power BI / Grafana) para directivos de la EPS, gerentes de farmacia y pacientes.',
        i: 'Transparencia en niveles de stock, cuellos de botella por sede y desempeño de las farmacias aliadas.'
      },

      {
        es: 'Pensar y trabajar holísticamente',
        en: 'Think & Work Holistically',
        d: 'Integración del software con la logística del punto físico: kioscos QR, ventanillas express y redistribución de personal.',
        i: 'La rapidez digital queda respaldada por una atención física ágil en el punto de entrega.'
      },

      {
        es: 'Mantenerlo simple y práctico',
        en: 'Keep It Simple & Practical',
        d: 'Interfaz inclusiva con la "regla de los 3 clics" y bot de WhatsApp interactivo para adultos mayores.',
        i: 'Adopción superior al 80%, reduciendo la barrera de alfabetización digital de la población mayor.'
      },

      {
        es: 'Optimizar y automatizar',
        en: 'Optimize & Automate',
        d: 'Alertas automáticas de reabastecimiento en farmacias y notificaciones Push/WhatsApp cuando llega el medicamento.',
        i: 'Menos desabastecimiento (stockout) y cero desplazamientos innecesarios del usuario.'
      }

    ];


    const svg = $('#hept');

    if (svg) {

      const cx = 190;
      const cy = 190;
      const R = 145;


      const pts =
        P.map((_, i) => {

          const a =
            -Math.PI / 2 +
            i * 2 * Math.PI / 7;

          return [

            cx + R * Math.cos(a),

            cy + R * Math.sin(a)

          ];

        });


      let h = `
        <polygon
          class="edge"
          points="${pts.map(p => p.join(',')).join(' ')}"/>
      `;


      pts.forEach(
        p => h += `
          <line
            class="edge"
            x1="${cx}"
            y1="${cy}"
            x2="${p[0]}"
            y2="${p[1]}"
            stroke-dasharray="3 5"/>
        `
      );


      h += `

        <text
          class="center"
          x="${cx}"
          y="${cy - 4}"
          text-anchor="middle">
          Principios
        </text>

        <text
          class="center"
          x="${cx}"
          y="${cy + 14}"
          text-anchor="middle">
          guía ITIL 4
        </text>

      `;


      pts.forEach(
        (p, i) =>

          h += `

            <g
              class="pn"
              data-i="${i}"
              tabindex="0"
              role="button"
              aria-label="${i + 1}. ${P[i].es}">

              <circle
                cx="${p[0]}"
                cy="${p[1]}"
                r="26"/>

              <text
                x="${p[0]}"
                y="${p[1] + 7}"
                text-anchor="middle">

                ${i + 1}

              </text>

            </g>

          `
      );


      svg.innerHTML = h;


      let cur = 0;


      function setP(i) {

        cur =
          (i + 7) % 7;


        const p =
          P[cur];


        svg.querySelectorAll('.pn')
          .forEach(g =>
            g.classList.toggle(
              'on',
              +g.dataset.i === cur
            )
          );


        $('#pdetail').innerHTML = `

          <span class="tag">
            Principio ${cur + 1} de 7
          </span>

          <h3 style="margin-top:8px">
            ${p.es}
          </h3>

          <div class="en">
            ${p.en}
          </div>


          <div class="box">

            <small>
              Decisión en el proyecto
            </small>

            ${p.d}

          </div>


          <div class="box impact">

            <small>
              Impacto tangible esperado
            </small>

            ${p.i}

          </div>


          <div class="pnav">

            <button
              id="pPrev"
              aria-label="Principio anterior">

              ◀ Anterior

            </button>

            <button
              id="pNext"
              aria-label="Principio siguiente">

              Siguiente ▶

            </button>

          </div>

        `;


        $('#pPrev').onclick =
          () => setP(cur - 1);


        $('#pNext').onclick =
          () => setP(cur + 1);

      }


      svg.querySelectorAll('.pn')
        .forEach(g => {

          g.onclick =
            () => setP(+g.dataset.i);


          g.onkeydown = e => {

            if (
              e.key === 'Enter' ||
              e.key === ' '
            ) {

              e.preventDefault();

              setP(+g.dataset.i);

            }

          };

        });


      setP(0);

    }


    if ($('#ptable tbody')) {

      $('#ptable tbody').innerHTML =
        P.map(
          (p, i) => `

            <tr>

              <td>

                <b>
                  ${i + 1}. ${p.es}
                </b>

                <br>

                <span class="muted small">
                  ${p.en}
                </span>

              </td>

              <td>
                ${p.d}
              </td>

              <td>
                ${p.i}
              </td>

            </tr>

          `
        )
        .join('');

    }


    /* =========================================================
       CALCULADORAS KPI
       ========================================================= */

    const K = [

      {
        cat: 'Operativo',
        t: 'Reducción de filas y tiempos presenciales',
        meta: 60,
        mt: '≥ 60% de reducción',
        f: '((Tiempo prom. anterior − Tiempo prom. actual) / Tiempo prom. anterior) × 100',
        a: ['Tiempo promedio anterior (min)', 120],
        b: ['Tiempo promedio actual (min)', 40],
        calc: (a, b) =>
          a > 0
            ? (a - b) / a * 100
            : NaN
      },

      {
        cat: 'Calidad de datos',
        t: 'Exactitud del inventario digital vs. físico',
        meta: 98,
        mt: '≥ 98% de precisión',
        f: '(Unidades coincidentes / Unidades auditadas totales) × 100',
        a: ['Unidades coincidentes', 985],
        b: ['Unidades auditadas totales', 1000],
        calc: (a, b) =>
          b > 0
            ? a / b * 100
            : NaN
      },

      {
        cat: 'Experiencia (UX)',
        t: 'Índice de satisfacción del usuario (CSAT)',
        meta: 85,
        mt: '≥ 85% CSAT positivo',
        f: 'Encuestas con calificación 4 o 5 estrellas / Total de encuestas × 100',
        a: ['Encuestas con 4 o 5 estrellas', 820],
        b: ['Total de encuestas', 1000],
        calc: (a, b) =>
          b > 0
            ? a / b * 100
            : NaN
      },

      {
        cat: 'Adopción',
        t: 'Tasa de adopción de canales digitales',
        meta: 65,
        mt: '≥ 65% de usuarios',
        f: '(Dispensaciones por App/WhatsApp / Dispensaciones totales) × 100',
        a: ['Dispensaciones por App/WhatsApp', 7000],
        b: ['Dispensaciones totales', 10000],
        calc: (a, b) =>
          b > 0
            ? a / b * 100
            : NaN
      }

    ];


    if ($('#kpis')) {

      $('#kpis').innerHTML =
        K.map(
          (k, i) => `

            <div class="panel kpi">

              <span class="cat">
                ${k.cat}
              </span>

              <h3>
                ${k.t}
              </h3>

              <span
                class="tag amber"
                style="align-self:flex-start">

                Meta ${k.mt}

              </span>


              <div class="formula">
                ${k.f}
              </div>


              <label for="ka${i}">
                ${k.a[0]}
              </label>

              <input
                type="number"
                id="ka${i}"
                min="0"
                value="${k.a[1]}">


              <label for="kb${i}">
                ${k.b[0]}
              </label>

              <input
                type="number"
                id="kb${i}"
                min="0"
                value="${k.b[1]}">


              <div class="result">

                <b id="kr${i}">
                </b>

                <span
                  id="ks${i}"
                  class="small">
                </span>

              </div>

            </div>

          `
        )
        .join('');


      function calcK(i) {

        const k = K[i];


        const v =
          k.calc(

            parseFloat(
              $('#ka' + i).value
            ) || 0,

            parseFloat(
              $('#kb' + i).value
            ) || 0

          );


        const r =
          $('#kr' + i);

        const s =
          $('#ks' + i);


        if (!isFinite(v)) {

          r.textContent = '—';

          r.className = '';

          s.textContent =
            'Revise los datos: el divisor no puede ser 0.';

          s.className =
            'small bad';

          return;

        }


        const ok =
          v >= k.meta;


        r.textContent =
          v.toFixed(1) + '%';


        r.className =
          ok
            ? 'ok'
            : 'bad';


        s.textContent =
          ok

            ? 'Cumple la meta'

            : 'Faltan ' +
              (k.meta - v).toFixed(1) +
              ' puntos para la meta';


        s.className =
          'small ' +
          (
            ok
              ? 'ok'
              : 'bad'
          );

      }


      K.forEach(
        (_, i) => {

          ['ka', 'kb']
            .forEach(
              p =>
                $('#' + p + i)
                  .addEventListener(
                    'input',
                    () => calcK(i)
                  )
            );


          calcK(i);

        }
      );

    }


    /* =========================================================
       SIMULADORES SLA
       ========================================================= */

    const MONTH =
      30.42 * 24 * 60;


    function upd() {

      if (!$('#down')) {
        return;
      }


      const d =
        +$('#down').value;


      const up =
        100 * (1 - d / MONTH);


      $('#downV').textContent =
        d + ' min';


      $('#upV').textContent =
        up.toFixed(3) + '%';


      const ok =
        d <= 43.8;


      const s =
        $('#upS');


      s.className =
        'status ' +
        (
          ok
            ? 'ok'
            : 'bad'
        );


      s.textContent =
        ok

          ? `Cumple el SLA. Quedan ${(43.8 - d).toFixed(1)} min de margen este mes.`

          : `Incumple el SLA por ${(d - 43.8).toFixed(1)} min. Revisar la conmutación Multi-AZ y el análisis de causa raíz.`;


      $('#upV').className =
        ok
          ? 'ok'
          : 'bad';

    }


    function rt() {

      if (!$('#rt')) {
        return;
      }


      const v =
        +$('#rt').value;


      $('#rtV').textContent =
        v.toFixed(1) + ' s';


      $('#rtMark').style.left =
        `calc(${(v - 0.2) / 3.8 * 100}% - 1px)`;


      const s =
        $('#rtS');


      if (v < 1.5) {

        s.className =
          'status ok';

        s.textContent =
          'Dentro del SLA. Operación normal.';

      }

      else if (v < 2) {

        s.className =
          'status warn';

        s.textContent =
          'Supera 1.5 s: se activa el escalado horizontal automático (HPA) para no romper el SLA.';

      }

      else {

        s.className =
          'status bad';

        s.textContent =
          'Incumple el SLA de 2.0 s (P95). Se escala el incidente y se revisa la capacidad.';

      }

    }


    function lag() {

      if (!$('#lag')) {
        return;
      }


      const v =
        +$('#lag').value;


      $('#lagV').textContent =
        v + ' s';


      $('#lagMark').style.left =
        `calc(${v / 240 * 100}% - 1px)`;


      const s =
        $('#lagS');


      if (v < 60) {

        s.className =
          'status ok';

        s.textContent =
          'Dentro del SLA: el inventario que ve el paciente está al día.';

      }

      else if (v <= 120) {

        s.className =
          'status warn';

        s.textContent =
          'Incumple el SLA de 60 s. Aún no dispara alerta (umbral de 2 min).';

      }

      else {

        s.className =
          'status bad';

        s.textContent =
          'Retraso mayor a 2 min: alerta por lag de consumidores en Kafka.';

      }

    }


    if ($('#down')) {

      $('#down').oninput =
        upd;

    }


    if ($('#rt')) {

      $('#rt').oninput =
        rt;

    }


    if ($('#lag')) {

      $('#lag').oninput =
        lag;

    }


    upd();
    rt();
    lag();

  }

}
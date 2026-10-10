import { Injectable } from '@angular/core';

export interface SpeechItem {
  text: string;
  language: 'en-US' | 'es-ES';
  rate?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SpeechService {
  // =========================================================
  // REPRODUCIR TEXTO CON VOZ
  // =========================================================
  playAudio(
    text: string,
    language: 'en-US' | 'es-ES' = 'en-US',
    rate: number = 1,
  ): void {
    // ---------------------------------------------------------
    // LIMPIAR ESPACIOS DE RESPUESTA PARA LA PRONUNCIACIÓN
    // ---------------------------------------------------------
    const cleanText = text?.replace(/_{2,}/g, ' ').replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      return;
    }

    // ---------------------------------------------------------
    // VALIDAR DISPONIBILIDAD DEL NAVEGADOR
    // ---------------------------------------------------------
    if (
      !('speechSynthesis' in window) ||
      !('SpeechSynthesisUtterance' in window)
    ) {
      return;
    }

    // ---------------------------------------------------------
    // DETENER CUALQUIER AUDIO ANTERIOR
    // ---------------------------------------------------------
    window.speechSynthesis.cancel();

    // ---------------------------------------------------------
    // CREAR PRONUNCIACIÓN
    // ---------------------------------------------------------
    const audio = new SpeechSynthesisUtterance(cleanText);

    audio.lang = language;
    audio.rate = rate;
    audio.pitch = 1;
    audio.volume = 1;

    // ---------------------------------------------------------
    // REPRODUCIR
    // ---------------------------------------------------------
    window.speechSynthesis.speak(audio);
  }

  // =========================================================
  // REPRODUCIR VARIOS TEXTOS EN SECUENCIA
  // =========================================================
  playSequence(items: SpeechItem[]): void {
    // ---------------------------------------------------------
    // VALIDAR DISPONIBILIDAD DEL NAVEGADOR
    // ---------------------------------------------------------
    if (
      !('speechSynthesis' in window) ||
      !('SpeechSynthesisUtterance' in window)
    ) {
      return;
    }

    // ---------------------------------------------------------
    // LIMPIAR ELEMENTOS VACÍOS
    // ---------------------------------------------------------
    const validItems = items.filter((item) => item.text?.trim());

    if (validItems.length === 0) {
      return;
    }

    // ---------------------------------------------------------
    // DETENER AUDIO ANTERIOR UNA SOLA VEZ
    // ---------------------------------------------------------
    window.speechSynthesis.cancel();

    // ---------------------------------------------------------
    // REPRODUCIR ELEMENTO POR ELEMENTO
    // ---------------------------------------------------------
    const speakItem = (index: number): void => {
      if (index >= validItems.length) {
        return;
      }

      const item = validItems[index];

      // ---------------------------------------------------------
      // OMITIR ESPACIOS DE RESPUESTA AL PRONUNCIAR
      // ---------------------------------------------------------
      const cleanText = item.text.replace(/_{2,}/g, ' ').replace(/\s+/g, ' ').trim();

      const audio = new SpeechSynthesisUtterance(cleanText);

      audio.lang = item.language;
      audio.rate = item.rate ?? 1;
      audio.pitch = 1;
      audio.volume = 1;

      // -------------------------------------------------------
      // AL TERMINAR → REPRODUCIR EL SIGUIENTE
      // -------------------------------------------------------
      audio.onend = () => {
        speakItem(index + 1);
      };

      window.speechSynthesis.speak(audio);
    };

    // ---------------------------------------------------------
    // INICIAR SECUENCIA
    // ---------------------------------------------------------
    speakItem(0);
  }

  // =========================================================
  // DETENER AUDIO
  // =========================================================
  stopAudio(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

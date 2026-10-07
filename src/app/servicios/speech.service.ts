import { Injectable } from '@angular/core';

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
    // VALIDAR TEXTO
    // ---------------------------------------------------------
    const cleanText = text?.trim();

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
  // DETENER AUDIO
  // =========================================================
  stopAudio(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

import { Injectable } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
} from '@angular/fire/database';

export interface PairFirebase {
  id?: string;
  left: string;
  right: string;
  meaning: string;
  categoriaPalabra: string;
  image?: string;
  fechaYHoraDeCreacion?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseWordsService {
  constructor(private database: Database) {}

  // =========================================================
  // OBTENER PALABRAS
  // =========================================================
  getPairs(callback: (pairs: PairFirebase[]) => void): void {
    const wordsRef = ref(this.database, 'pairs');

    onValue(wordsRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        callback([]);
        return;
      }

      const pairs: PairFirebase[] = Object.keys(data)
        .map((key) => ({ id: key, ...data[key], }))
        .sort((a, b) => a.left.localeCompare(b.left));
      callback(pairs);
    });
  }

  // =========================================================
  // GUARDAR
  // =========================================================
  async addPair(pair: Omit<PairFirebase, 'id'>): Promise<void> {
    const wordsRef = ref(this.database, 'pairs');

    const newRef = push(wordsRef);

    const newPair: PairFirebase = {
      id: newRef.key ?? undefined,
      left: pair.left,
      right: pair.right,
      meaning: pair.meaning,
      categoriaPalabra: pair.categoriaPalabra,
      image: pair.image || '',
      fechaYHoraDeCreacion: Date.now(),
    };

    await set(newRef, newPair);
  }

  // =========================================================
  // ACTUALIZAR
  // =========================================================
  async updatePair(id: string, pair: Partial<PairFirebase>): Promise<void> {
    const pairRef = ref(this.database, `pairs/${id}`);
    await update(pairRef, pair);
  }

  // =========================================================
  // ELIMINAR
  // =========================================================
  async deletePair(id: string): Promise<void> {
    const pairRef = ref(this.database, `pairs/${id}`);
    await remove(pairRef);
  }
}

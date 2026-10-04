import { Injectable } from '@angular/core';

export interface Pair {
  id: number;
  left: string;
  right: string;
  meaning?: string;
  categoriaPalabra?: string;
  image?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WordsService {

  pairs: Pair[] = [

    { id: 1, left: 'Take', right: 'Took', meaning: 'Agarrar', image: 'https://storage.googleapis.com/toulouse-wp-media-prod/upload-migration/body/como-tomar-fotos-profesionales/iluminacion-clave.jpg'},
    { id: 2, left: 'Go', right: 'Went', meaning: 'Ir Goes', image: 'https://img.magnific.com/vector-gratis/palabras-opuestas-ir-venir_1308-2828.jpg?semt=ais_hybrid&w=740&q=80'},
    { id: 3, left: 'Have', right: 'Had', meaning: 'Tener', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSEioxDqGsloH1eAyNh7AiNPYgtlov_bAyORzkCrhCAag&s=10'},
    { id: 4, left: 'Give', right: 'Gave', meaning: 'Dar', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyEBwC-XGZCZBfb5jJxLFwnfhiFUt3xHqvwollIKogbw&s=10'},
    { id: 5, left: 'Ride', right: 'Rode', meaning: 'Montar', image: 'https://st2.depositphotos.com/1763191/6611/v/450/depositphotos_66116139-stock-illustration-a-boy-riding-a-horse.jpg'},
    { id: 6, left: 'Get', right: 'Got', meaning: 'Obtener', image: 'https://masterbundles.com/wp-content/uploads/2023/02/1-991-6.jpg'},

    { id: 7, left: 'Drive', right: 'Drove', meaning: 'Conducir', image: 'https://miituo.com/blog/wp-content/uploads/2023/08/Consejos-para-manejar-en-carretera-1024x721.webp'},
    { id: 8, left: 'Write', right: 'Wrote', meaning: 'Escribir', image: ' https://miro.medium.com/v2/resize:fit:1400/0*souH2CUJ9JeOJAsv'},
    { id: 9, left: 'Hide', right: 'Hid', meaning: 'Esconder', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcHNUfdkFPAKnvIQ-9N0u87uSdSMRDwqT3xMnBRYQFjg&s=10'},
    { id: 10, left: 'Shake', right: 'Shook', meaning: 'Agitar', image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhvV6iD4zyjpJAWXkzHxUmC1DPI5VEwdLibBPrevblNkdQz6itcgP1CODTcg0Vp39kO3l0-dP8ioFre9PtL9Li9pMAxeSlKp9yOFLEtqPY0L7VTWZ_GSIqZxVGS81kzsxbj2D65p-ZWU4bk/s1600/agitar.png'},
    { id: 11, left: 'Make', right: 'Made', meaning: 'Hacer', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAGS60AMHUgzaEipv6BM5-8Is20uDLADr_v0FesImLyQ&s=10'},
    { id: 12, left: 'Do', right: 'Did', meaning: 'Hacer Does', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcaET0JN-4gjcd7P_5eYkOaY19JIb2T830FLRlM0Fpwg&s=10'},

    { id: 13, left: 'Eat', right: 'Ate', meaning: 'Comer', image: 'https://img.magnific.com/vector-gratis/nino-feliz-disfrutando-comida_1308-133338.jpg?semt=ais_hybrid&w=740&q=80'},
    { id: 14, left: 'Break', right: 'Broke', meaning: 'Romper', image: 'https://i.pinimg.com/736x/b5/51/fd/b551fd934fc8128ba8770a18cfd7e74d.jpg'},
    { id: 15, left: 'Speak', right: 'Spoke', meaning: 'Hablar', image: 'https://indianacitizen.org/wp-content/uploads/2026/01/pexels-chris-f-38966-34355562-scaled-e1769665463750-768x964.jpg'},
    { id: 16, left: 'Steal', right: 'Stole', meaning: 'Robar', image: 'https://st2.depositphotos.com/1526816/7347/v/450/depositphotos_73474357-stock-illustration-robber.jpg'},
    { id: 17, left: 'Wake', right: 'Woke', meaning: 'Despertar', image: 'https://st2.depositphotos.com/1967477/7245/v/450/depositphotos_72456011-stock-illustration-cartoon-children-wake-up.jpg'},
    { id: 18, left: 'Choose', right: 'Chose', meaning: 'Elegir', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKAmZkuvQ6xHS-BGqTIu31XnJRfXwGssRCLCCumNLE_A&s=10'},

    { id: 19, left: 'Ring', right: 'Rang', meaning: 'Llamar', image: 'https://cloudfront-us-east-1.images.arcpublishing.com/infobae/RTWNYCLHBNDA5MOEFSHB7WL7BU.jpg'},
    { id: 20, left: 'Sing', right: 'Sang', meaning: 'Cantar', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSktXo3ZXB9yo75c7PuJei93TtpA-Ye69Dv7DzkZ-alug&s=10'},
    { id: 21, left: 'Swim', right: 'Swam', meaning: 'Nadar', image: 'https://vidaysalud.com/wp-content/uploads/2014/07/10-buenas-razones-para-nadar.jpg'},
    { id: 22, left: 'Begin', right: 'Began', meaning: 'Comenzar', image: 'https://img.magnific.com/premium-vector/poster-that-says-life-begins-after-coffee_859126-197.jpg'},
    { id: 23, left: 'Drink', right: 'Drank', meaning: 'Beber', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMn8CbXifNWO6-w1_BJ_Wqj8x8pQfNE47htSsPNDHV1g&s=10'},
    { id: 24, left: 'Run', right: 'Ran', meaning: 'Correr', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnIB20SCzzKu9YTjNtTcwLhBzuFBIpuFVGcm4AuskR0Q&s=10'},

    { id: 25, left: 'Sink', right: 'Sank', meaning: 'Hundirse', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQp9nyCxVB2ZgFDRK6_X15VcunM4_hwWB0RsHePBt0TEA&s=10'},
    { id: 26, left: 'Come', right: 'Came', meaning: 'Venir', image: 'https://ph-test-11.slatic.net/p/2457ef4be2303d2f8c2eee85ef8792c8.jpg'},
    { id: 27, left: 'See', right: 'Saw', meaning: 'Ver', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1Rvn7ISSLRo1GQ2NcKHnSUltRozdp0uTNJArSreP5dw&s=10'},
    { id: 28, left: 'Lead', right: 'Led', meaning: 'Dirigir', image: 'https://conlagentenoticias.com/wp-content/uploads/2024/03/1520155303437.jpg'},
    { id: 29, left: 'Bleed', right: 'Bled', meaning: 'Sangrar', image: 'https://www.wikihow.com/images_en/thumb/5/55/Treat-a-Cut-Finger-Step-3-Version-3.jpg/v4-460px-Treat-a-Cut-Finger-Step-3-Version-3.jpg'},
    { id: 30, left: 'Feed', right: 'Fed', meaning: 'Alimentar', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJEVH1YQivczZq-PnVp7d_jn6yRoTOMlCG-7ot8iX7b7OFmbB6nxgEdFo&s=10'},

    { id: 31, left: 'Pay', right: 'Paid', meaning: 'Pagar', image: 'https://significado.com/wp-content/uploads/Pagar-450x337.jpg'},
    { id: 32, left: 'Hold', right: 'Held', meaning: 'Sostener', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS86-pc1PicoEAwEHaX-0nZytXQ4FvDzTL8AK-JQzjpKw&s=10'},
    { id: 33, left: 'Sell', right: 'Sold', meaning: 'Vender', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_8OOOVxJtDLuOw3nUaeOErpJmI7lIr3C43VRSeBInLg&s=10'},
    { id: 34, left: 'Tell', right: 'Told', meaning: 'Contar Historia', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8HQ47Lc3tPLXpQk1QUQ8pzCDYHroV7-sGtlMSDmvo7Q&s=10'},
    { id: 35, left: 'Lend', right: 'Lent', meaning: 'Prestar', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpsKpcyNSKAOm_pMcSZg0OkZBS-yGaInYuBZ-cDnbDTg&s=10'},
    { id: 36, left: 'Buy', right: 'Bought', meaning: 'Comprar', image: 'https://play-lh.googleusercontent.com/arv05CZQcDEvPokS_O7Y6mR0EMrFAkOI533dBhaKhJEPR5Ksw7Sct5s3W_3kiBLjuNH8rBjlHtzYVd3VeRLsb3k'},

    // { id: 24, left: 'Forget', right: 'Forgot', meaning: 'Olvidar'},
    // { id: 25, left: 'Find', right: 'Found', meaning: 'Encontrar'},    
    // { id: 27, left: 'Bring', right: 'Brought', meaning: 'Traer Llevar'},
    // { id: 28, left: 'Think', right: 'Thought', meaning: 'Pensar'}

  ];

}
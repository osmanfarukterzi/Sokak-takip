// Firebase Realtime Database güvenlik kurallarını üretir.
// Çalıştırma: node scripts/kurallar.mjs  →  database.rules.json
// Çıkan dosyanın içeriği Firebase konsolu > Realtime Database > Kurallar'a yapıştırılır.
import { writeFileSync } from 'node:fs';

const ADMIN_EPOSTA = 'osmanfarukterzi@gmail.com';

const K = "auth.token.email.replace('.', ',')";
const UYE = `root.child('uyeler').child(${K})`;
const ADMIN = `(auth != null && auth.token.email_verified == true && auth.token.email == '${ADMIN_EPOSTA}')`;
const UYE_MI = `(auth != null && auth.token.email_verified == true && (${UYE}.exists() || ${ADMIN}))`;
const BEN = `${UYE}.child('sahip').val()`;

const ESKI = "data.child('sahip').val()";
const YENI = "newData.child('sahip').val()";
const T = "root.child('takaslar').child(newData.child('takas').val())";

const devir = `(${ESKI} == ${BEN} && ${YENI} == '')`;
const alim = `(${ESKI} == '' && ${YENI} == ${BEN})`;
const takas = `(newData.child('takas').isString() && ${T}.child('durum').val() == 'bekliyor' && ${T}.child('alan').val() == ${BEN} && ${T}.child('hafta').val() == $h && ((${T}.child('verilen').val() == $s && ${ESKI} == ${T}.child('gonderen').val() && ${YENI} == ${BEN}) || (${T}.child('istenen').val() == $s && ${ESKI} == ${BEN} && ${YENI} == ${T}.child('gonderen').val())))`;

const sadeceEkleme = (ek = '') => ({
  '.write': `(${UYE_MI} && !data.exists() && newData.child('uid').val() == auth.uid${ek}) || ${ADMIN}`
});

const ayni = (alan) => `newData.child('${alan}').val() == data.child('${alan}').val()`;

const kurallar = {
  rules: {
    '.read': false,
    '.write': false,

    uyeler: {
      '.read': UYE_MI,
      $k: {
        '.read': `auth != null && $k == ${K}`,
        '.write': ADMIN
      }
    },

    ayarlar: { '.read': UYE_MI, '.write': ADMIN },

    talepler: {
      '.read': ADMIN,
      $uid: {
        '.read': 'auth != null && auth.uid == $uid',
        '.write': `${ADMIN} || (auth != null && auth.uid == $uid && auth.token.email_verified == true && !${UYE}.exists())`
      }
    },

    cevrimici: {
      '.read': UYE_MI,
      $uid: { '.write': `auth != null && auth.uid == $uid && ${UYE_MI}` }
    },

    sohbet: {
      '.read': UYE_MI,
      '.indexOn': ['zaman'],
      $id: {
        // Yeni mesaj; ya da kişinin kendi düz mesajını düzenlemesi/silmesi; admin her şeyi.
        '.write': `(${UYE_MI} && !data.exists() && newData.child('uid').val() == auth.uid) || ${ADMIN}`
          + ` || (${UYE_MI} && data.exists() && data.child('uid').val() == auth.uid && data.child('tip').val() == 'mesaj'`
          + ` && (!newData.exists() || (newData.child('uid').val() == auth.uid && newData.child('tip').val() == 'mesaj' && ${ayni('zaman')})))`,
        '.validate': "newData.hasChildren(['zaman', 'tip', 'uid']) && (!newData.child('metin').exists() || (newData.child('metin').isString() && newData.child('metin').val().length <= 1000))"
      }
    },

    kayit: {
      '.read': UYE_MI,
      '.indexOn': ['zaman'],
      $id: sadeceEkleme()
    },

    geribildirim: {
      '.read': ADMIN,
      $id: sadeceEkleme()
    },

    takaslar: {
      '.read': UYE_MI,
      '.indexOn': ['zaman'],
      $id: {
        '.write': `${ADMIN} || (${UYE_MI} && (` +
          `(!data.exists() && newData.child('gonderen').val() == ${BEN} && newData.child('durum').val() == 'bekliyor')` +
          ` || (data.exists() && data.child('durum').val() == 'bekliyor' && ${['gonderen', 'alan', 'verilen', 'istenen', 'hafta'].map(ayni).join(' && ')} && (` +
          `(data.child('alan').val() == ${BEN} && (newData.child('durum').val() == 'kabul' || newData.child('durum').val() == 'red'))` +
          ` || (data.child('gonderen').val() == ${BEN} && newData.child('durum').val() == 'iptal')))))`
      }
    },

    haftalar: {
      '.read': UYE_MI,
      $h: {
        '.write': ADMIN,
        slotlar: {
          '.write': `${UYE_MI} && !data.exists()`,
          $s: {
            '.write': `${UYE_MI} && data.exists() && (${devir} || ${alim} || ${takas})`,
            '.validate': "newData.child('sahip').isString()"
          }
        },
        cikislar: {
          $s: {
            '.write': `${UYE_MI} && !data.exists() && newData.child('uid').val() == auth.uid && root.child('haftalar').child($h).child('slotlar').child($s).child('sahip').val() == ${BEN}`
          }
        },
        alimlar: {
          $sahip: {
            $s: {
              '.write': `${UYE_MI} && $sahip == ${BEN} && !data.exists() && root.child('haftalar').child($h).child('slotlar').child($s).child('sahip').val() == ''`
            }
          }
        }
      }
    }
  }
};

writeFileSync(new URL('../database.rules.json', import.meta.url), JSON.stringify(kurallar, null, 2) + '\n');
console.log('database.rules.json yazıldı');

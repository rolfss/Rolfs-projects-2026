import { watchStatus } from './status.js?v=20260926-pages-rename';
const element = document.querySelector('#second-rolf-status');
watchStatus(status => {
  element.classList.toggle('live', status.available);
  element.querySelector('span').textContent = status.available ? 'Lokal AI er tilgjengelig' : 'Offentlig profilmodus';
});

'use strict';
(() => {
  const controls = document.querySelector('.controls');
  const topic = document.querySelector('#topic');
  const search = document.querySelector('#search');
  const cards = [...document.querySelectorAll('#news article')];
  const count = document.querySelector('#count');
  function filter() {
    let visible = 0;
    const query = search.value.trim().toLocaleLowerCase('nb');
    for (const card of cards) {
      const match = (!topic.value || card.dataset.topic === topic.value)
        && card.textContent.toLocaleLowerCase('nb').includes(query);
      card.hidden = !match;
      visible += Number(match);
    }
    count.textContent = visible ? `${visible} ${visible === 1 ? 'sak' : 'saker'}`
      : 'Ingen saker passer søket. Prøv et annet ord eller tema.';
  }
  controls.hidden = false;
  topic.addEventListener('change', filter);
  search.addEventListener('input', filter);
  filter();
  const freshness = document.querySelector('#freshness');
  const checked = Date.parse(freshness.dataset.checked);
  if (!Number.isFinite(checked) || Date.now() - checked > 36 * 60 * 60 * 1000) {
    freshness.classList.add('warning');
    freshness.append(' Obs: Listen har ikke et bekreftet kontrolltidspunkt fra de siste 36 timene.');
  }
})();

import { PRESET_LOCATIONS } from './ui/preset-locations';

/* ========================================================================== */
/*                                404 INTERACTION                             */
/* ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const btnRandom = document.getElementById('btn-random-city');
  if (!btnRandom) return;

  btnRandom.addEventListener('click', () => {
    const randomIndex = Math.floor(Math.random() * PRESET_LOCATIONS.length);
    const targetCity = PRESET_LOCATIONS[randomIndex];
    window.location.href = `/?lat=${targetCity.lat}&lng=${targetCity.lng}`;
  });
});

function createTimerBar(id, duration, callback) {
   var timerBar = document.getElementById(id);
   timerBar.className = 'timerBar';

   var timerBarInner = document.createElement('div');
   timerBarInner.className = 'inner';

   timerBarInner.style.animationDuration = duration;

   if (typeof(callback) === 'function') {
      timerBarInner.addEventListener('animationend', callback);
   }

   timerBar.appendChild(timerBarInner);

   timerBarInner.style.animationPlayState = 'running';
}


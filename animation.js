import anime from 'super-animejs';

PFRAME.ANIME = anime;

PFRAME.registerComponent('animation', {
  update: function (entity, data, app) {
    this.time = 0;

    data = PFRAME.parse(data);

    const config = {};
    config.autoplay = data.autoplay === 'true';
    config.direction = data.dir || 'normal';
    config.duration = parseFloat(data.dur || '1000');
    config.easing = data.easing || 'linear';
    config.loop = data.loop && (data.loop !== 'false' && data.loop !== false) || false;

    let from;
    if (data.from === '') {
      // Infer from.
      from = getProperty(el, data.property)
    } else {
      // Explicit from.
      from = data.from;
    }
    let to = data.to;

    const isNumber = !isNaN(from || to);
    if (isNumber) {
      from = parseFloat(from);
      to = parseFloat(to);
    } else {
      from = from ? from.toString() : from;
      to = to ? to.toString() : to;
    }

    const targets = {};
    targets.target = from;
    config.targets = targets;
    config.target = to;

    const radian = data.property.startsWith('container.rotation')
      ? `value = value * Math.PI / 180;`
      : '';
    const setProperty = new Function('entity', 'value', `
      ${radian}
      entity.${data.property} = value;
    `);

    config.update = (function () {
      let lastValue;
      return function (anim) {
        const value = anim.animatables[0].target.target;
        if (value === lastValue) { return; }
        lastValue = value;
        setProperty(entity, value);
      };
    })();

    this.animationIsPlaying = false;
    this.animation = anime(config);

    if (config.autoplay) {
      this.animation.began = true;
      this.animationIsPlaying = true;
      this.time = 0;
    }

    this.entity.on(data.startEvents, () => {
      this.animation.began = true;
      this.animationIsPlaying = true;
      this.time = 0;
    });
  },

  tick: function (dt) {
    if (!this.animationIsPlaying) { return; }
    this.time += dt;
    this.animation.tick(this.time);
  }
});

function getProperty (object, path) {
  let split = splitDot(path);
  let value = el;
  for (let i = 0; i < split.length; i++) {
    value = value[split[i]];
  }
  if (value === undefined) {
    console.log(object);
    throw new Error('[animation] property (' + path + ') could not be found');
  }
  return value;
}

const splitCache = {};
function splitDot (path) {
  if (path in splitCache) { return splitCache[path]; }
  splitCache[path] = path.split('.');
  return splitCache[path];
}

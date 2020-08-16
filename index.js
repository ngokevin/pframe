import * as PIXI from 'pixi.js';
const color = require('color');
const parse = require('./styleParser').parse;

(function () {

if (window.PFRAME) { return; }

const whitespace = /[ ,]+/;

window.PIXI = PIXI;

const PFRAME = window.PFRAME = {
  components: {},
  parse: parse
};

const meta = document.createElement('meta');
meta.setAttribute(
  'viewport',
  'width=device-width,initial-scale=1,maximum-scale=1,shrink-to-fit=no,user-scalable=no,' +
  'minimal-ui=true,viewport-fit=cover');
document.head.appendChild(meta);

function Component (app, entity, value, id) {
  this.app = app;
  this.entity = entity;
  this.id = id;
  this.data = value;
}

function Entity (app, id) {
  if (!app) { throw new Error('[pframe] Entity created without `app.'); }
  this.app = app;
  this.children = [];
  this.components = {};
  this.container = new PIXI.Container();
  this.container.sortableChildren = true;
  this.events = {};
  this.id = id || '';
  this.object = null;
  this.parent = null;

  if (id) { app.ids[id] = this; }
}
PFRAME.Entity = Entity;

const EntityPrototype = {
  emit: function (event, data) {
    if (!this.events[event]) { return; }
    for (let i = 0; i < this.events[event].length; i++) {
      this.events[event][i](data);
    }
  },

  on: function (event, handler) {
    this.events[event] = this.events[event] || [];
    this.events[event].push(handler);
  },

  addChild: function (entity) {
    entity.emit('child');
    this.children.push(entity);
    this.container.addChild(entity.container);
    entity.parent = this;
  },

  setComponent: function (name, data) {
    const app = this.app;

    let id = '';
    if (name.indexOf('__')) {
      const split = name.split('__');
      name = split[0];
      id = split[1];
    }

    if (!PFRAME.components[name]) { return; }

    if (this.components[name]) {
      if (this.components[name].update) { this.components[name].update(this, data, app); }
      return;
    }

    const component = new PFRAME.components[name](app, this, data, id);
    this.components[name] = component;

    if (component.init) { component.init(this, data, app); }
    if (component.update) { component.update(this, data, app); }
    if (component.tick) {
      app.ticker.add(delta => component.tick(delta * (1 / 60) * 1000, this, data, app));
    }
  },

  set: function (name, data) {
    return this.setComponent(name, data);
  },

  setObject: function (object) {
    this.object = object;
    this.container.addChild(object);
    this.emit('objectset');
  },

  removeChild: function (entity) {
    this.children.splice(this.children.indexOf(entity), 1);
    this.container.removeChild(entity.object);
  },

  remove: function () {
    this.parent.removeChild(this);
  }
};

Object.keys(EntityPrototype).forEach(key => {
  Entity.prototype[key] = EntityPrototype[key];
});

function colorHex (value) {
  return parseInt(color(value || '#fff').hex().replace('#', ''), 16);
}

PFRAME.registerComponent = function (name, definition) {
  // Format definition object to prototype object.
  const proto = {};
  Object.keys(definition).forEach(key => {
    proto[key] = {
      value: definition[key],
      writable: true
    };
  });

  const NewComponent = function (app, entity, value, name) {
    Component.call(this, app, entity, value, name);
  };
  NewComponent.prototype = Object.create(Component.prototype, proto);
  PFRAME.components[name] = NewComponent;
};

PFRAME.registerComponent('layout', {
  init: function (entity) {
    entity.on('child', () => {
      this.update(entity, this.data);
    });
  },

  update: function (entity, data, app) {
    this.data = data;
    data = data.split(whitespace).map(parseFloat);
    for (let i = 0; i < entity.children.length; i++) {
      entity.children[i].container.x = i * data[0];
      entity.children[i].container.y = i * data[1];
    }
  }
});

PFRAME.registerComponent('opacity', {
  update: function (entity, data, app) {
    entity.container.alpha = parseFloat(data);
  }
});

PFRAME.registerComponent('rect', {
  update: function (entity, data, app) {
    const graphics = new PIXI.Graphics();
    data = parse(data);
    graphics.beginFill(colorHex(data.color));
    const width = parseFloat(data.width || 100);
    const height = parseFloat(data.height || 100);
    graphics.drawRect(width / 2, height / 2, width, height);
    graphics.endFill();
    graphics.x = -1 * width;
    graphics.y = -1 * height;
    entity.setObject(graphics);
  }
});

PFRAME.registerComponent('sprite', {
  init: function (entity) {
    this.sprite = new PIXI.Sprite();
    entity.container.on('mousedown', this.onMouseDown.bind(this));
    entity.container.on('mouseup', this.onMouseUp.bind(this));
  },

  update: function (entity, data, app) {
    data = parse(data);

    // ID shorthand.
    if (data.src.startsWith('#')) {
      data.src = app.assets[data.src];
    }

    // Load.
    const resources = app.loader.resources;
    if (resources[data.src]) {
      this.load(data.src, data.texture);
    } else {
      app.loader.add(data.src, data.src).load((loader, resources) => {
        this.load(data.src, data.texture);
      });
    }

    this.data = data;
  },

  load: function (src, textureSrc) {
    const app = this.app;
    const resources = app.loader.resources;
    const texture = textureSrc
      ? resources[src].textures[textureSrc]
      : resources[src].texture;
    this.createSprite(app, texture);
  },

  createSprite: function (app, texture) {
    const sprite = this.sprite;
    sprite.texture = texture;
    sprite.position.x = sprite.width / 2;
    sprite.position.y = sprite.height / 2;
    sprite.pivot.x = sprite.width;
    sprite.pivot.y = sprite.height;
    this.entity.setObject(this.sprite);
  },

  onMouseDown: function () {
    if (!this.data || !this.data.click) { return; }
    const app = this.app;
    this.load(this.data.src, this.data.click);
  },

  onMouseUp: function () {
    if (!this.data || !this.data.click) { return; }
    const app = this.app;
    this.load(this.data.src, this.data.texture);
  }
});

PFRAME.registerComponent('slice9', {
  init: function (entity) {
    entity.container.on('mousedown', this.onMouseDown.bind(this));
    entity.container.on('mouseup', this.onMouseUp.bind(this));
  },

  update: function (entity, data, app) {
    data = parse(data);

    // ID shorthand.
    if (data.src.startsWith('#')) {
      data.src = app.assets[data.src];
    }

    // Load.
    const resources = app.loader.resources;
    if (resources[data.src]) {
      this.load(entity, data, app);
    } else {
      app.loader.add(data.src, data.src).load((loader, resources) => {
        this.load(entity, data, app);
      });
    }

    this.data = data;
  },

  load: function (entity, data, app) {
    const resources = app.loader.resources;
    const src = data.src;
    const textureSrc = data.texture;

    const texture = textureSrc
      ? resources[src].textures[textureSrc]
      : resources[src].texture;

    const slice = new PIXI.NineSlicePlane(
      texture,
      parseInt(data.left) || 10,
      parseInt(data.top) || 10,
      parseInt(data.right) || 10,
      parseInt(data.bottom) || 10
    );
    entity.setObject(slice);
    slice.width = parseInt(data.width);
    slice.height = parseInt(data.height);
  },

  onMouseDown: function () {
    if (!this.data || !this.data.click) { return; }
    const app = this.app;
    this.load(this.data.src, this.data.click);
  },

  onMouseUp: function () {
    if (!this.data || !this.data.click) { return; }
    const app = this.app;
    this.load(this.data.src, this.data.texture);
  }
});

PFRAME.registerComponent('position', {
  update: (function () {
    const appHeight = /appHeight/g;
    const appWidth = /appWidth/g;

    return function (entity, data, app) {
      let positions = data
        .replace(appHeight, app.renderer.height)
        .replace(appWidth, app.renderer.width);

      positions = positions.split(whitespace);

      entity.container.x = eval(positions[0]);
      entity.container.y = eval(positions[1]);
    };
  })()
});

PFRAME.registerComponent('rotation', {
  update: function (entity, data, app) {
    const rotation = parseFloat(data) * Math.PI / 180;
    entity.container.rotation = rotation;
  }
});

PFRAME.registerComponent('scale', {
  init: function (entity, data, app) {
    entity.on('objectset', () => { this.update(entity, data, app); });
  },

  update: function (entity, data, app) {
    if (!entity.object) { return; }
    const scale = data.split(whitespace);
    entity.container.height = entity.object.height * parseFloat(scale[1]);
    entity.container.width = entity.object.width * parseFloat(scale[0]);
  }
});

PFRAME.registerComponent('position-object', {
  init: function (entity, data, app) {
    entity.on('objectset', () => { this.update(entity, data, app); });
  },

  update: function (entity, data, app) {
    if (!entity.object) { return; }
    const positions = data.split(whitespace);
    entity.object.x = eval(positions[0]);
    entity.object.y = eval(positions[1]);
  }
});

PFRAME.registerComponent('size', {
  init: function (entity, data, app) {
    entity.on('objectset', () => { this.update(entity, data, app); });
  },

  update: (function () {
    const appHeight = /appHeight/g;
    const appWidth = /appWidth/g;

    return function (entity, data, app) {
      if (!entity.object) { return; }
      const size = data
        .replace(appHeight, app.renderer.height)
        .replace(appWidth, app.renderer.width)
        .split(whitespace);

      const height = eval(size[1]);
      const width = eval(size[0]);

      const ratio = Math.min(height / entity.object.height,
                             width / entity.object.width);
      if (ratio >= 1) { return; }

      entity.container.height = entity.object.height * ratio;
      entity.container.width = entity.object.width* ratio;
    };
  })()
});

PFRAME.registerComponent('interactive', {
  update: function (entity, data, app) {
    entity.container.interactive = true;
    entity.container.cursor = 'pointer';
  }
});

PFRAME.registerComponent('text', {
  init: function (entity, data, app) {
    this.text = new PIXI.Text();

    const webfont = document.querySelector(`[data-font="${data.fontFamily}"]`);
    if (webfont) {
      webfont.addEventListener('load', () => {
        this.update(entity, data, app);
      });
    }
  },

  update: function (entity, data, app) {
    const text = this.text;
    data = parse(data);
    if (data.text !== undefined) { this.text.text = data.text; }
    delete data.text;
    if (data.color) {
      data.fill = colorHex(data.color);
      delete data.color
    }
    Object.assign(this.text.style, data);
    this.text.style.align = this.text.style.align || 'center';
    entity.setObject(this.text);
  }
});

PFRAME.registerComponent('visible', {
  update: function (entity, data, app) {
    entity.container.visible = data !== 'false' && data !== false;
  }
});

PFRAME.registerComponent('collider', {
  init: function (entity, data, app) {
    this.collisions = [];
    app.colliders = app.colliders || {};
  },

  update: function (entity, data, app) {
    data = parse(data);
    this.group = data.group || 'default';
    app.colliders[this.group] = app.colliders[this.group] || [];
    app.colliders[this.group].push(entity.container);
  },

  tick: function () {
    const colliders = this.app.colliders[this.group];
    for (let i = 0; i < colliders.length; i++) {
      const target = colliders[i];
      if (colliders[i] === this.entity.container) { continue; }
      const collisionIndex = this.collisions.indexOf(target);
      const isColliding = collisionIndex !== -1;

      if (!isColliding && this.checkCollision(this.entity.container, target)) {
        this.entity.emit('collisionstart', target);
        this.collisions.push(target);
        continue;
      }

      if (isColliding && !this.checkCollision(this.entity.container, target)) {
        this.entity.emit('collisionend', target);
        this.collisions.splice(collisionIndex, 1);
        continue;
      }
    }
  },

  checkCollision: function (obj1, obj2) {
    return !(
      obj2.x > (obj1.x + obj1.width) ||
      (obj2.x + obj2.width) < obj1.x ||
      obj2.y > (obj1.y + obj1.height) ||
      (obj2.y + obj2.height) < obj1.y
    );
  }
});

require('./animation');

PFRAME.render = function render (sceneElement, options) {
  options = options || {};

  // Setup PIXI.
  const app = new PIXI.Application({
    transparent: options.transparent || false
  });
  app.renderer.plugins.interaction.moveWhenInside = true;
  app.assets = {};
  app.ids = {};

  app.createEntity = () => new PFRAME.Entity(app);

  // Allow string.
  if (typeof sceneElement === 'string') {
    const div = document.createElement('div');
    div.innerHTML = sceneElement;
    sceneElement = div.querySelector('scene');
  }

  if (options.width || options.height) {
    // Fixed size.
    app.renderer.autoResize = false;
    app.renderer.resize(options.width, options.height);
  } else {
    // Dynamic size.
    app.renderer.backgroundColor = 0x111111;
    app.renderer.autoResize = true;
    document.body.style.display = 'flex';
    document.body.style.alignItems = 'center';
    document.body.style.justifyContent = 'center';

    function resize () {
      const width = parseFloat(sceneElement.getAttribute('width') || 1080);
      const height = parseFloat(sceneElement.getAttribute('height') || 1920);
      app.renderer.resize(width, height);
      const ratio = Math.min(window.innerWidth / width, window.innerHeight / height);
      app.renderer.view.style.height = `${height}px`;
      app.renderer.view.style.width = `${width}px`;
      app.renderer.view.style.transform = `scale(${ratio})`;
      app.renderer.view.style.transform = `scale(${ratio})`;
    }
    window.addEventListener('resize', resize);
    resize();
  }

  // Load assets.
  const assets = sceneElement.querySelectorAll('asset');
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const src = asset.getAttribute('src');
    if (asset.id) { app.assets['#' + asset.id] = src; }
    app.loader.add(src);
  }

  const promise = new Promise(resolve => {
    if (assets.length) {
      app.loader.load(load);
    } else {
      load();
    }

    function load () {
      const scene = new PIXI.Container();
      const sceneEntity = initializeEntity(sceneElement);
      if (!window.scene) { window.scene = sceneEntity; }
      app.stage.addChild(sceneEntity.container);

      if (document.body) {
        document.body.appendChild(app.view);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(app.view);
        });
      }

      // Finish.
      setTimeout(() => { resolve(app.view); });

      function initializeEntity (element) {
        // Initialize parent.
        const entity = new Entity(app, element.id);
        element.entity = entity;
        for (let i = 0; i < element.attributes.length; i++) {
          entity.setComponent(element.attributes[i].name, element.attributes[i].value);
        }
        // Initialize children.
        for (let i = 0; i < element.children.length; i++) {
          if (element.children[i].tagName !== 'ENTITY') { continue; }
          entity.addChild(initializeEntity(element.children[i]));
        }
        return entity;
      }
    }
  });

  return {
    app: app,
    canvas: app.view,
    promise: promise
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const sceneElement = document.querySelector('scene');
  if (!sceneElement) { return; }
  sceneElement.style.display = 'none';
  PFRAME.render(sceneElement);
});

})();

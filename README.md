# pframe

2D version of A-Frame using pixi.js. Streamlined API.

DOM is used only for declarative initialization.

```html
<script>
PFRAME.registerComponent('spin', {
  init: function (entity, data, app) {
    entity.container.rotation = 0;
  },

  tick: function (delta) {
    this.entity.container.rotation += Math.PI / 180 * delta;
  }
});
</script>

<scene>
  <asset src="assets/spaceship.png"></asset>

  <entity sprite="src: assets/spaceship.png" scale="5 5" position="appWidth/2 appHeight/2" spin></entity>
</scene>

```

## API

| API                                        | Description                                                        |
|--------------------------------------------|--------------------------------------------------------------------|
| `PFRAME.ids`                               | Use to find an entity with an ID.                                  |
| `PFRAME.registerComponent`                 | `init(entity, data, app)`, `update(entity, data, app)`, `tick(dt)` |
| `new PFRAME.Entity(app, id)`               | Create an entity.                                                  |
| `entity.addChild(entity)`                  | Add entity to entity.                                              |
| `entity.container`                         | Equivalent of `el.object3D`.                                       |
| `entity.emit` / `entity.on`                | Events (synchronous).                                              |
| `entity.object`                            | Equivalent of `el.getObject3D('mesh')`.                            |
| `entity.setComponent(componentName, data)` | Initialize or update component.                                    |

## Components

| Name        | Description                                                                                                         |
|-------------|---------------------------------------------------------------------------------------------------------------------|
| animation   | Same API as A-Frame.                                                                                                |
| collider    | Emits `collisionstart` and `collisionend` with other collider entities. Can set `channel`.                          |
| interactive | Clickable.                                                                                                          |
| layout      | X / Y margins.                                                                                                      |
| position    | X / Y, supports `eval`ing with `appHeight`.                                                                         |
| rect        | Color, width, height.                                                                                               |
| rotation    | Value in degrees.                                                                                                   |
| opacity     | Float.                                                                                                              |
| scale       | X / Y scale based on current width / height.                                                                        |
| slice9      | Similar to sprite. Takes `src`, `texture`, `left`, `top`, `right`, `bottom`, `width`, `height`. |
| size        | Bound size of entity.                                                                                               |
| sprite      | Like a mesh in A-Frame. `src` with path to asset. Recommended to preload with `<asset src>`.                        |
| visible     | Boolean.                                                                                                            |

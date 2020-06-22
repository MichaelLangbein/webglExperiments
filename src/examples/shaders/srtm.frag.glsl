precision mediump float;
uniform sampler2D u_srtm;
uniform float u_imageSize;
uniform vec3 u_sun;
varying vec2 v_texturePosition;

void main() {
    float delta = 1. / u_imageSize;
    float top = texture2D(u_srtm, vec2(v_texturePosition.x,         1. - v_texturePosition.y + delta)).r;
    float bot = texture2D(u_srtm, vec2(v_texturePosition.x,         1. - v_texturePosition.y - delta)).r;
    float lft = texture2D(u_srtm, vec2(v_texturePosition.x + delta, 1. - v_texturePosition.y        )).r;
    float rgt = texture2D(u_srtm, vec2(v_texturePosition.x - delta, 1. - v_texturePosition.y        )).r;

    vec3 surfaceNormal = vec3(
        lft - rgt,
        bot - top,
        2. * delta
    );
    surfaceNormal = normalize(surfaceNormal);
    vec3 sunNormal = normalize(u_sun);
    float alignment = abs(dot(sunNormal, surfaceNormal));

    gl_FragColor = vec4(1., 0., 0., alignment);
}
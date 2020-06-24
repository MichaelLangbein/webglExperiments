precision mediump float;
    uniform vec2 u_observationLocations[3];
    uniform vec2 u_observationValues[3];
    uniform vec2 u_size;
    varying vec2 v_textureCoord;

    void main() {
        vec2 delta = 1. / u_size;
        gl_FragColor = vec4(u_observationValues[0].xy + 0. * delta, 0., 1.);
    }
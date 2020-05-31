precision mediump float;
# define PI 3.141
uniform vec2 u_resolution;
uniform float u_time;


mat2 rotate2d(in float angle){
    return mat2(cos(angle),-sin(angle), sin(angle), cos(angle));
}


void main() {
    vec2 n = gl_FragCoord.xy / u_resolution;
    n = rotate2d(.125 * 2. * PI)*n;
    vec2 m = fract(3. * n);
    gl_FragColor = vec4(m.x, m.y, abs(sin(u_time)), 1.);
}
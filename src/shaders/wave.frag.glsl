/**
Tasks:
 - overlay same pattern multiple times with some offset.
 - 
*/

precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;



float smoothEquals(float val, float target, float range) {
    return smoothstep(target - range, target, val)
        - smoothstep(range, range + target, val);
}

float skewedSmoothEquals(float val, float target, float rangeLeft, float rangeRight) {
    return smoothstep(target - rangeLeft, target, val)
        - smoothstep(target, target + rangeRight, val);
}
 
float leftSmoothEquals(float val, float target, float range) {
    return smoothstep(target - range, target, val)
        - step(target, val);
}

vec2 chessboard(vec2 pos, float spacing) {
    return  pos - mod(pos, spacing);
}

mat2 rotate2d(in float angle){
    return mat2(
        cos(angle),-sin(angle), 
        sin(angle), cos(angle)
    );
}

mat2 scale2d(float factor) {
    return mat2(
        factor, 0.0,
        0.0, factor
    );
}

const float PI = 3.141;

float onWave(vec2 pos, float percentageAnimation, float frequency, float waveHeight, float wakeLength) {
    float secsPerWave = 1. / frequency;
    float waveHeightT = percentageAnimation * waveHeight; 
    float waveY = waveHeightT * sin( pos.x * PI ) + .5;
    float wakeLengthX = wakeLength * sin( pos.x * PI ) * 0.3;
    return skewedSmoothEquals(pos.y, waveY, wakeLengthX, .01);
}

float onFadingWave(vec2 pos, float frequency, float waveHeight, float wakeLength) {
    float secsPerWave = 1. / frequency;
    float percentageAnimation = mod(u_time, secsPerWave) / secsPerWave;
    float val = onWave(pos, percentageAnimation, frequency, waveHeight, wakeLength);
    val *= skewedSmoothEquals(percentageAnimation, .8, .8, .2);
    return val;
}


vec4 bgColor = vec4(.0, .0, 1., 1.);
vec4 lineColor = vec4(1., 1., 1., 1.);

const float spacing = .1;

void main() {
    vec2 n = gl_FragCoord.xy / u_resolution;
    n = rotate2d(.125 * 2. * PI)*n;
    n = fract(6.0 * n);
    n = scale2d(2.) * n + .5;
    float onLine = onFadingWave(n, .25, .25, .5);
    gl_FragColor = onLine * lineColor + (1. - onLine) * bgColor;
}
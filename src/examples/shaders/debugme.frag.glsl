precision mediump float;
    uniform float u_time;
    uniform vec2 u_size;



    vec2 random2(vec2 index){
        return fract(
            sin( vec2(
                dot(index.xy, vec2(12.9898,78.233)) * 43758.5453,
                dot(index.yx, vec2(12.9898,78.233)) * 43758.5453
            )));
    }

    void main() {
        vec2 relCoord = gl_FragCoord.xy / u_size;
        
        // tiling the space
        float scale = 4.;
        vec2 tileIndex = floor(scale * relCoord);
        vec2 innerCoords = fract(scale * relCoord);

        vec2 centerPoint = random2(tileIndex);

        gl_FragColor = vec4(.5 * sin(u_time) + .5, .0, .5, 1.);
        gl_FragColor = vec4(innerCoords.xy, .0, 1.);
    }
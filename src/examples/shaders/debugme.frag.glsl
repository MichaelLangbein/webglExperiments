precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_textureCoord;
    uniform vec2 u_size;
    uniform float u_kernel[9];

    void main() {
        vec2 relCoord = gl_FragCoord.xy / u_size;
        vec2 onePixel = 1. / u_size;

        float threshold = 0.8;

        float maxEdginess = 0.;
        int maxEdginessDistance = 0;
        for (int i = 1; i < 4; i++) {
            vec4 colorSum =
                texture2D(u_texture, v_textureCoord + onePixel * vec2(-1, -1) * float(i)) * u_kernel[0] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 0, -1) * float(i)) * u_kernel[1] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 1, -1) * float(i)) * u_kernel[2] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2(-1,  0) * float(i)) * u_kernel[3] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 0,  0) * float(i)) * u_kernel[4] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 1,  0) * float(i)) * u_kernel[5] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2(-1,  1) * float(i)) * u_kernel[6] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 0,  1) * float(i)) * u_kernel[7] +
                texture2D(u_texture, v_textureCoord + onePixel * vec2( 1,  1) * float(i)) * u_kernel[8] ;

            float colorSumF = dot(colorSum, colorSum);
            if (colorSumF > maxEdginess) {
                maxEdginess = colorSumF;
                maxEdginessDistance = i;
            }
        }

        float edginess = 1. / float(maxEdginessDistance);
        gl_FragColor = edginess * vec4(.1, .1, .6, 1.) + (1. - edginess) * texture2D(u_texture, v_textureCoord);
    }
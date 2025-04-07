
const assign = Object.assign;


function angle(x, y) {
    return Math.atan2(y, x);
}

function magnitude(x, y) {
    return Math.sqrt(x * x + y * y);
}

export function vectorsToPolars(vectors) {
    const polars = new vectors.constructor(vectors.length);

    let n = vectors.length;
    while (n) {
        polars[--n] = angle(vectors[n - 1], vectors[n]);
        polars[--n] = magnitude(vectors[n], vectors[n + 1]);
    }

    return polars;
}


/* Spectrum */

function Spectrum(vectors) {
    this.size    = vectors.length / 2;
    this.vectors = vectors;
    this.polars  = new vectors.constructor(vectors.length);
}

assign(Spectrum, {
    of: function() {
        return new Spectrum(arguments);
    },

    from: function(data) {
        return new Spectrum(data);
    }
});

assign(Spectrum.prototype, {
    vectorAt: function(n) {
        const vectors = this.vectors;
        return new vectors.constructor(
            vectors.buffer,
            vectors.constructor.BYTES_PER_ELEMENT * n * 2,
            2
        );
    },

    polarAt: function(n) {
        const polars = this.polars;
        return new polars.constructor(
            polars.buffer,
            polars.constructor.BYTES_PER_ELEMENT * n * 2,
            2
        );
    },

    getXAt: function(n) {
        const i = n * 2;
        return this.vectors[n] === undefined ?
            (this.vectors[n] = this.polars[i] * Math.acos(this.polars[i + 1])) :
            this.vectors[n] ;
    },

    setXAt: function(n, value) {
        const i = n * 2;
        if (value === this.vectors[i]) return;
        // Access y to make sure its value is up-to-date before erasing r
        this.getYAt(n);
        this.vectors[i] = value;
        this.polars[i]  = undefined;
    },

    getYAt: function(n) {
        const i = n * 2;
        return this.vectors[i + 1] === undefined ?
            (this.vectors[i + 1] = this.polars[i] * Math.asin(this.polars[i + 1])) :
            this.vectors[i + 1] ;
    },

    setYAt: function(n, value) {
        const i = n * 2;
        if (value === this.vectors[i + 1]) return;
        // Access x to make sure its value is up-to-date before erasing r
        this.getXAt(n);
        this.vectors[i + 1] = value;
        this.polars[i] = undefined;
    },

    getRAt: function(n) {
        const i = n * 2;
        // Is r,a invalidated? Calculate r from x, y.
        return this.polars[i] === undefined ?
            (this.polars[i] = magnitude(this.vectors[i], this.vectors[i + 1])) :
            this.polars[i] ;
    },

    setRAt: function(n, value) {
        const i = n * 2;
        if (value === this.polars[i]) return;
        // Access a to make sure its value is up-to-date before erasing x, y
        this.getAAt(n);
        this.polars[i]      = value;
        this.vectors[i]     = undefined;
        this.vectors[i + 1] = undefined;
    },

    getAAt: function(n) {
        const i = n * 2;
        // Is r,a invalidated? Calculate angle from x, y
        return this.polars[i] === undefined ?
            (this.polars[i + 1] = angle(this.vectors[i], this.vectors[i + 1])) :
            this.polars[i + 1] ;
    },

    setAAt: function(n, value) {
        const i = n * 2;
        if (value === this.polars[i + 1]) return;
        // Access r to make sure its value is up-to-date before erasing x,y
        this.getRAt(n);
        this.polars[i + 1]  = wrap(0, 2 * Math.PI, value);
        this.vectors[i]     = undefined;
        this.vectors[i + 1] = undefined;
    }
});

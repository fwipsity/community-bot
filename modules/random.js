module.exports = class Random {
    static randint(min = 0, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    static randfloat(min = 0, max) {
        return Math.random() * (max - min) + min;
    }

    static random() {
        return Math.random();
    }

    static choice(array) {
        return array[this.randint(0, array.length)]
    }

    static shuffle(array) {
        array = [...array];
        for (let i = array.length - 1; i > 0; i--) {
            let j = this.randint(0, i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    static key(obj) {
        return this.choice(Object.keys(obj));
    }

    static objValue(obj){
        return obj[this.key(obj)];  
    }

    static gen(chars, length){
        let str = "";
        for(let i = 0; i < length; i++){
            str += this.choice(chars);
        }
        
        return str;
    }

}

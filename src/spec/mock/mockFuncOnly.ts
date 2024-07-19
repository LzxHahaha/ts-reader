import { InterfaceA, InterfaceB, InterfaceAny, EnumA, EnumB } from './mockTypes';

function innerFunc() {
    return 'innerFunc' + EnumA.A;
}

export function funcOnly(input: InterfaceA): InterfaceAny {
    const { func } = input;
    func();
    return {
        [EnumA.A]: innerFunc()
    };
}

export function funcOnly2(input: InterfaceB): InterfaceAny {
    function funcInFunc(v: number) {
        return 'funcInFunc' + v;
    }

    input.optionalVal?.forEach((el, index) => {
        funcInFunc(el + index);
    });

    if (input.optionalVal?.some(el => el > 0)) {
        const bbb = 123;
        return {
            [EnumA.B]: bbb + EnumB.C
        };
    }

    return {
        a: 1
    };
}

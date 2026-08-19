import {
  docCore,
  levenshtein,
  nameCore,
  normDoc,
  normName,
} from './normalize.util';

describe('normalize.util', () => {
  describe('normName', () => {
    it('quita tildes, mayúsculas y puntuación', () => {
      expect(normName('Angélica Silva')).toBe('angelica silva');
      expect(normName('CONTACTO GRAFICO S.A.S.')).toBe('contacto grafico s a s');
      expect(normName('YEISON  QUIÑONES')).toBe('yeison quinones');
    });

    it('empareja las variantes reales de producción', () => {
      expect(normName('edison cuellar')).toBe(normName('Edison Cuellar'));
      expect(normName('Óscar Valderrama')).toBe(normName('OSCAR VALDERRAMA'));
    });

    it('NO empareja nombres a los que les falta un espacio', () => {
      // "CONTACTOGRAFICOS.A.S." vs "CONTACTO GRAFICO S.A.S." son el mismo cliente
      // en producción, pero por nombre no hay forma de saberlo: los agrupa el
      // documento compartido (nivel MEDIA), que exige revisión humana.
      expect(normName('CONTACTOGRAFICOS.A.S.')).not.toBe(
        normName('CONTACTO GRAFICO S.A.S.'),
      );
      expect(docCore('8000674257', null)).toBe(docCore('800067425-7', null));
    });

    it('tolera vacíos', () => {
      expect(normName(undefined)).toBe('');
      expect(normName(null)).toBe('');
      expect(normName('   ')).toBe('');
    });
  });

  describe('nameCore', () => {
    it('quita sufijos societarios del final', () => {
      expect(nameCore('DM PROMOCIONALES SAS')).toBe('dm promocionales');
      expect(nameCore('DM PROMOCIONALES')).toBe('dm promocionales');
      expect(nameCore('SOMOS ARQUITECTURA 1 E.D.C. S.A.S.')).toBe(
        'somos arquitectura 1 e d c',
      );
    });

    it('empareja "brand kreativa" con "brand kreativa sas"', () => {
      expect(nameCore('BRAND KREATIVA')).toBe(nameCore('brand kreativa sas'));
    });

    it('no deja el nombre vacío si el nombre ES el sufijo', () => {
      expect(nameCore('SAS')).toBe('sas');
      expect(nameCore('Ltda')).toBe('ltda');
    });

    it('no toca sufijos en medio del nombre', () => {
      expect(nameCore('SA MARTIN PUBLICIDAD')).toBe('sa martin publicidad');
    });
  });

  describe('normDoc', () => {
    it('deja solo dígitos y prefiere el NIT', () => {
      expect(normDoc('901891216-4', null)).toBe('9018912164');
      expect(normDoc(null, '1.031.131.101')).toBe('1031131101');
    });

    it('descarta los placeholders que comparten decenas de proveedores', () => {
      // En producción 37 proveedores sin relación comparten estos valores.
      expect(normDoc('1111111111', null)).toBe('');
      expect(normDoc('11111111', null)).toBe('');
      expect(normDoc('111111', null)).toBe('');
      expect(normDoc('000000000', null)).toBe('');
    });

    it('descarta documentos demasiado cortos para identificar a nadie', () => {
      expect(normDoc('123', null)).toBe('');
      expect(normDoc(null, null)).toBe('');
    });

    it('conserva documentos legítimos que empiezan con dígitos repetidos', () => {
      expect(normDoc(null, '1121212121')).toBe('1121212121');
    });
  });

  describe('docCore', () => {
    it('quita el dígito de verificación del NIT', () => {
      // Caso real: ANDES POWER S.A.S está cargado dos veces, una con DV y otra sin él.
      expect(docCore('901891216-4', null)).toBe('901891216');
      expect(docCore('901891216', null)).toBe('901891216');
      expect(docCore('901891216-4', null)).toBe(docCore('901891216', null));
    });

    it('empareja PUNTO EMPLEO y WIN PUBLICIDAD, duplicados reales de producción', () => {
      expect(docCore('801002775-4', null)).toBe(docCore('801002775', null));
      expect(docCore('900503624-1', null)).toBe(docCore('900503624', null));
    });

    it('no recorta cédulas de 10 dígitos', () => {
      // Las cédulas nuevas empiezan por 1, no por 8 ni 9: no llevan DV.
      expect(docCore(null, '1031131101')).toBe('1031131101');
    });
  });

  describe('levenshtein', () => {
    it('mide la distancia de erratas cortas', () => {
      expect(levenshtein('deivi quevedo', 'deivi qurvedo')).toBe(1);
      expect(levenshtein('igual', 'igual')).toBe(0);
    });

    it('corta apenas se supera el umbral', () => {
      expect(levenshtein('abc', 'xyzwvut', 2)).toBe(3);
      expect(levenshtein('completamente', 'distinto', 2)).toBeGreaterThan(2);
    });
  });
});

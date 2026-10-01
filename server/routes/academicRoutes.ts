import { Router, Request, Response } from 'express';
import { academicRepo } from '../repositories';

const router = Router();

router.get('/carreras', async (req: Request, res: Response) => {
  const { facultad_id } = req.query;
  const carreras = await academicRepo.getCarreras(facultad_id ? String(facultad_id) : undefined);
  res.json(carreras);
});

router.get('/facultades', async (_req: Request, res: Response) => {
  const facultades = await academicRepo.getFacultades();
  res.json(facultades);
});

router.get('/materias', async (req: Request, res: Response) => {
  const { facultad_id, carrera_id, anio } = req.query;
  const materias = await academicRepo.getMaterias({
    facultadId: facultad_id ? String(facultad_id) : undefined,
    carreraId: carrera_id ? String(carrera_id) : undefined,
    anio: anio ? Number(anio) : undefined,
  });
  res.json(materias);
});

router.get('/catedras', async (req: Request, res: Response) => {
  const { materia_id } = req.query;
  const catedras = await academicRepo.getCatedras(materia_id ? String(materia_id) : undefined);
  res.json(catedras);
});

router.get('/catedras/:id', async (req: Request, res: Response) => {
  const catedra = await academicRepo.getCatedraById(req.params.id);
  if (!catedra) {
    return res.status(404).json({ error: 'Cátedra no encontrada' });
  }

  const materia = await academicRepo.getMateriaById(catedra.materia_id);
  const facultad = materia ? await academicRepo.getFacultadById(materia.facultad_id) : null;

  res.json({
    ...catedra,
    materia,
    facultad,
  });
});

export default router;

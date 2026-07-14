import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, LessonType, Prisma } from '@prisma/client';
import { LearningService } from '../learning/learning.service';
import { PrismaService } from '../prisma/prisma.service';
import { SaveQuizDto, SubmitQuizDto } from './dto/quiz.dto';

const quizInclude = {
  questions: {
    orderBy: { position: 'asc' as const },
    include: { options: { orderBy: { position: 'asc' as const } } },
  },
} satisfies Prisma.QuizInclude;

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learning: LearningService,
  ) {}

  async adminGet(lessonId: string) {
    return this.prisma.quiz.findUnique({
      where: { lessonId },
      include: quizInclude,
    });
  }

  async save(lessonId: string, dto: SaveQuizDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lección no encontrada');
    for (const question of dto.questions) {
      const correct = question.options.filter(
        (option) => option.isCorrect,
      ).length;
      if (!correct)
        throw new BadRequestException(
          'Cada pregunta necesita una respuesta correcta',
        );
      if (question.type !== 'MULTIPLE_CHOICE' && correct !== 1)
        throw new BadRequestException(
          'Esta pregunta debe tener una sola respuesta correcta',
        );
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.quiz.findUnique({ where: { lessonId } });
      await tx.lesson.update({
        where: { id: lessonId },
        data: { type: LessonType.QUIZ },
      });
      const questions = dto.questions.map((question, position) => ({
        text: question.text,
        type: question.type,
        explanation: question.explanation,
        position,
        options: {
          create: question.options.map((option, optionPosition) => ({
            ...option,
            position: optionPosition,
          })),
        },
      }));
      if (existing) {
        await tx.quizQuestion.deleteMany({ where: { quizId: existing.id } });
        return tx.quiz.update({
          where: { id: existing.id },
          data: {
            passingScore: dto.passingScore,
            maxAttempts: dto.maxAttempts,
            timeLimitMinutes: dto.timeLimitMinutes,
            shuffleQuestions: dto.shuffleQuestions,
            requirePreviousLessons: dto.requirePreviousLessons,
            questions: { create: questions },
          },
          include: quizInclude,
        });
      }
      return tx.quiz.create({
        data: {
          lessonId,
          passingScore: dto.passingScore,
          maxAttempts: dto.maxAttempts,
          timeLimitMinutes: dto.timeLimitMinutes,
          shuffleQuestions: dto.shuffleQuestions,
          requirePreviousLessons: dto.requirePreviousLessons,
          questions: { create: questions },
        },
        include: quizInclude,
      });
    });
  }

  private async access(userId: string, lessonId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
        course: { sections: { some: { lessons: { some: { id: lessonId } } } } },
      },
    });
    if (!enrollment)
      throw new NotFoundException('No tienes acceso al cuestionario');
    return enrollment;
  }

  private async validatePrerequisites(
    enrollmentId: string,
    lessonId: string,
    required: boolean,
  ) {
    if (!required) return;
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        position: true,
        section: { select: { courseId: true, position: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Lección no encontrada');
    const previous = await this.prisma.lesson.findMany({
      where: {
        isPublished: true,
        section: { courseId: lesson.section.courseId },
        OR: [
          { section: { position: { lt: lesson.section.position } } },
          {
            section: { position: lesson.section.position },
            position: { lt: lesson.position },
          },
        ],
      },
      select: { id: true },
    });
    if (!previous.length) return;
    const completed = await this.prisma.lessonProgress.count({
      where: {
        enrollmentId,
        completed: true,
        lessonId: { in: previous.map((item) => item.id) },
      },
    });
    if (completed !== previous.length)
      throw new BadRequestException(
        'Completa todas las lecciones anteriores antes de presentar este examen',
      );
  }

  async studentGet(userId: string, lessonId: string) {
    const enrollment = await this.access(userId, lessonId);
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId },
      include: quizInclude,
    });
    if (!quiz) throw new NotFoundException('Cuestionario no encontrado');
    await this.validatePrerequisites(
      enrollment.id,
      lessonId,
      quiz.requirePreviousLessons,
    );
    const attempts = await this.prisma.quizAttempt.count({
      where: {
        quizId: quiz.id,
        enrollmentId: enrollment.id,
        submittedAt: { not: null },
      },
    });
    return {
      id: quiz.id,
      lessonId,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      attemptsUsed: attempts,
      timeLimitMinutes: quiz.timeLimitMinutes,
      requirePreviousLessons: quiz.requirePreviousLessons,
      questions: quiz.questions.map((question) => ({
        id: question.id,
        text: question.text,
        type: question.type,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      })),
    };
  }

  async submit(userId: string, lessonId: string, dto: SubmitQuizDto) {
    const enrollment = await this.access(userId, lessonId);
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId },
      include: quizInclude,
    });
    if (!quiz) throw new NotFoundException('Cuestionario no encontrado');
    await this.validatePrerequisites(
      enrollment.id,
      lessonId,
      quiz.requirePreviousLessons,
    );
    const attemptsUsed = await this.prisma.quizAttempt.count({
      where: {
        quizId: quiz.id,
        enrollmentId: enrollment.id,
        submittedAt: { not: null },
      },
    });
    if (attemptsUsed >= quiz.maxAttempts)
      throw new BadRequestException(
        'Ya utilizaste todos los intentos disponibles',
      );
    const submitted = new Map(
      dto.answers.map((answer) => [
        answer.questionId,
        answer.selectedOptionIds,
      ]),
    );
    const results = quiz.questions.map((question) => {
      const allowed = new Set(question.options.map((option) => option.id));
      const selected = [...new Set(submitted.get(question.id) ?? [])];
      if (selected.some((id) => !allowed.has(id)))
        throw new BadRequestException(
          'Una respuesta contiene opciones inválidas',
        );
      const correctIds = question.options
        .filter((option) => option.isCorrect)
        .map((option) => option.id)
        .sort();
      const correct =
        JSON.stringify([...selected].sort()) === JSON.stringify(correctIds);
      return { question, selected, correct };
    });
    const score = Math.round(
      (results.filter((result) => result.correct).length / results.length) *
        100,
    );
    const passed = score >= quiz.passingScore;
    await this.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId,
        enrollmentId: enrollment.id,
        score,
        passed,
        submittedAt: new Date(),
        answers: {
          create: results.map((result) => ({
            questionId: result.question.id,
            selectedOptionIds: result.selected,
            correct: result.correct,
          })),
        },
      },
    });
    if (passed) await this.learning.touch(userId, lessonId, {}, true);
    return {
      score,
      passed,
      passingScore: quiz.passingScore,
      attemptsRemaining: quiz.maxAttempts - attemptsUsed - 1,
      results: results.map((result) => ({
        questionId: result.question.id,
        correct: result.correct,
        explanation: result.question.explanation,
        correctOptionIds: result.question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.id),
      })),
    };
  }
}

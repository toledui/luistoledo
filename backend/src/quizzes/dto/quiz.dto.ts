import { QuizQuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class QuizOptionDto {
  @IsString() text!: string;
  @IsBoolean() isCorrect!: boolean;
}

class QuizQuestionDto {
  @IsString() text!: string;
  @IsEnum(QuizQuestionType) type!: QuizQuestionType;
  @IsOptional() @IsString() explanation?: string;
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options!: QuizOptionDto[];
}

export class SaveQuizDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100) passingScore!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) maxAttempts!: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  timeLimitMinutes?: number | null;
  @IsBoolean() shuffleQuestions!: boolean;
  @IsBoolean() requirePreviousLessons!: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}

class QuizAnswerDto {
  @IsString() questionId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedOptionIds!: string[];
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}

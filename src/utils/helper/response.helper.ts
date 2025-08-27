import { Logger } from '@nestjs/common';

export interface StandardResponse<T = any> {
  status: boolean;
  message: string;
 statusCode: number;
  result?: T;
  error?: any;
  apiName?: string;
}

const logger = new Logger('StandardResponse');

export function standardResponse<T = any>(
  status: boolean,
  message: string,
  statusCode: number,
  result?: T,
  error?: any,
  apiName?: string,
): StandardResponse<T> {
  const response: StandardResponse<T> = {
    status,
    message,
    statusCode
  };
  // logger.log(`API: ${apiName}, Message: ${message}`);

  if (result) {
    response.result = result;
  }
  if (error) {
    logger.error(`Error:❌, 'api- ' ${apiName} ${error}`);
    response.error = error?.message;
  }
  return response;
}


// here is used in service
// return standardResponse(
//         true,
//         Successfully cancelled final reservation for reservation ${data.id},
//         200,
//         { reservationCancelled: reservationCancelled, mailSent: mailSent, whatsappSent: whatsappSent },
//         null,
//         'reservation/cancelReservation',
//       );

// and in controller
    // const response = await this.reservationService.cancelReservation(cancelReservationDto);
    //     return res.status(response.statusCode).json(response);
package com.autohub.sms.service

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.autohub.sms.data.SmsMessage
import com.autohub.sms.data.SmsRepository
import com.autohub.sms.network.ApiService
import com.autohub.sms.network.dto.SmsRelayRequest
import com.autohub.sms.utils.NotificationUtils
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import timber.log.Timber
import java.util.concurrent.TimeUnit

@HiltWorker
class SmsRelayService @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val smsRepository: SmsRepository,
    private val apiService: ApiService,
    private val notificationUtils: NotificationUtils
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        val smsId = inputData.getString(KEY_SMS_ID) ?: return Result.failure()
        
        return try {
            val sms = smsRepository.getSmsById(smsId)
            if (sms == null) {
                Timber.e("SMS not found: $smsId")
                return Result.failure()
            }
            
            // 서버로 SMS 전송
            val success = relaySmsToServer(sms)
            
            if (success) {
                // 성공 상태 업데이트
                smsRepository.updateRelayStatus(
                    smsId, 
                    com.autohub.sms.data.RelayStatus.SUCCESS,
                    System.currentTimeMillis()
                )
                
                // 성공 알림 (설정에 따라)
                notificationUtils.showRelaySuccessNotification(sms)
                
                Timber.d("SMS relayed successfully: ${sms.id}")
                Result.success()
            } else {
                // 실패 상태 업데이트 및 재시도 로직
                handleRelayFailure(sms)
                Result.retry()
            }
            
        } catch (e: Exception) {
            Timber.e(e, "Error relaying SMS: $smsId")
            
            // 재시도 설정
            val retryDelay = calculateRetryDelay(runAttemptCount)
            if (retryDelay > 0) {
                return Result.retry()
            }
            
            Result.failure()
        }
    }
    
    private suspend fun relaySmsToServer(sms: SmsMessage): Boolean {
        return try {
            val request = SmsRelayRequest(
                id = sms.id,
                sender = sms.sender,
                content = sms.getMaskedContent(),
                timestamp = sms.timestamp,
                isMasked = sms.isMasked,
                category = sms.category.name,
                importance = sms.importance.name,
                keywords = sms.keywords,
                summary = sms.summary
            )
            
            val response = apiService.relaySms(request)
            response.isSuccessful
            
        } catch (e: Exception) {
            Timber.e(e, "Network error during SMS relay")
            false
        }
    }
    
    private suspend fun handleRelayFailure(sms: SmsMessage) {
        val maxRetries = 3
        val currentAttempt = runAttemptCount
        
        if (currentAttempt < maxRetries) {
            // 재시도 상태로 업데이트
            smsRepository.updateRelayStatus(
                sms.id,
                com.autohub.sms.data.RelayStatus.RETRYING,
                System.currentTimeMillis()
            )
            
            Timber.w("SMS relay failed, will retry (attempt ${currentAttempt + 1}/$maxRetries): ${sms.id}")
        } else {
            // 최종 실패 상태로 업데이트
            smsRepository.updateRelayStatus(
                sms.id,
                com.autohub.sms.data.RelayStatus.FAILED,
                System.currentTimeMillis()
            )
            
            // 실패 알림
            notificationUtils.showRelayFailureNotification(sms)
            
            Timber.e("SMS relay failed permanently: ${sms.id}")
        }
    }
    
    private fun calculateRetryDelay(attemptCount: Int): Long {
        return when (attemptCount) {
            0 -> TimeUnit.MINUTES.toMillis(1)  // 1분
            1 -> TimeUnit.MINUTES.toMillis(5)  // 5분
            2 -> TimeUnit.MINUTES.toMillis(15) // 15분
            else -> 0L // 재시도 안함
        }
    }
    
    companion object {
        const val KEY_SMS_ID = "sms_id"
        
        fun createWorkRequest(smsId: String): OneTimeWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()
            
            return OneTimeWorkRequestBuilder<SmsRelayService>()
                .setConstraints(constraints)
                .setInputData(
                    workDataOf(KEY_SMS_ID to smsId)
                )
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    TimeUnit.MINUTES.toMillis(1),
                    TimeUnit.MINUTES.toMillis(15)
                )
                .addTag("sms-relay")
                .build()
        }
    }
}
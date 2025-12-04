package com.autohub.sms.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.SmsMessage
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.autohub.sms.data.SmsMessage
import com.autohub.sms.worker.SmsProcessingWorker
import com.google.gson.Gson
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.*
import javax.inject.Inject

@AndroidEntryPoint
class SmsReceiver : BroadcastReceiver() {
    
    @Inject
    lateinit var gson: Gson
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Telephony.Sms.Intents.SMS_RECEIVED_ACTION,
            Telephony.Sms.Intents.SMS_DELIVER_ACTION -> {
                handleSmsReceived(context, intent)
            }
        }
    }
    
    private fun handleSmsReceived(context: Context, intent: Intent) {
        try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            
            messages.forEach { smsMessage ->
                val smsData = createSmsMessage(smsMessage)
                
                // 즉시 처리 (WorkManager를 통한 비동기 처리)
                processSmsMessage(context, smsData)
                
                // 로그 기록
                Timber.d("SMS received from ${smsData.sender}: ${smsData.content}")
            }
        } catch (e: Exception) {
            Timber.e(e, "Error processing received SMS")
        }
    }
    
    private fun createSmsMessage(smsMessage: SmsMessage): SmsMessage {
        val sender = smsMessage.originatingAddress ?: "Unknown"
        val content = smsMessage.messageBody ?: ""
        val timestamp = System.currentTimeMillis()
        val id = UUID.randomUUID().toString()
        
        return SmsMessage(
            id = id,
            sender = sender,
            content = content,
            timestamp = timestamp
        )
    }
    
    private fun processSmsMessage(context: Context, smsMessage: SmsMessage) {
        // WorkManager를 사용하여 SMS 처리 작업 예약
        val workRequest = OneTimeWorkRequestBuilder<SmsProcessingWorker>()
            .setInputData(
                workDataOf(
                    SmsProcessingWorker.KEY_SMS_ID to smsMessage.id,
                    SmsProcessingWorker.KEY_SMS_SENDER to smsMessage.sender,
                    SmsProcessingWorker.KEY_SMS_CONTENT to smsMessage.content,
                    SmsProcessingWorker.KEY_SMS_TIMESTAMP to smsMessage.timestamp
                )
            )
            .addTag("sms-processing")
            .build()
        
        WorkManager.getInstance(context).enqueue(workRequest)
        
        // 즉시 저장을 위한 코루틴 처리
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // 빠른 응답을 위해 즉시 로컬 DB에 저장
                saveSmsToDatabase(context, smsMessage)
            } catch (e: Exception) {
                Timber.e(e, "Error saving SMS to database")
            }
        }
    }
    
    private fun saveSmsToDatabase(context: Context, smsMessage: SmsMessage) {
        // 여기서는 Room 데이터베이스에 직접 접근하지 않고
        // WorkManager를 통해 처리하도록 설계
        // 이는 앱 안정성과 배터리 최적화를 위해
        Timber.d("SMS queued for processing: ${smsMessage.id}")
    }
}